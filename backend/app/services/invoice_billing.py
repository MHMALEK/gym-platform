"""Create invoices from subscriptions and renewal batches."""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.client_subscription import ClientSubscription
from app.models.invoice import Invoice
from app.models.plan_template import PlanTemplate
from app.services.invoice_events import emit_invoice_event
from app.services.invoice_numbering import allocate_next_reference


def _subscription_amount_currency(pt: PlanTemplate) -> tuple[Decimal | None, str]:
    cur = pt.currency or "USD"
    if pt.discount_price is not None:
        return pt.discount_price, cur
    return pt.price, cur


def _period_for_current_term(sub: ClientSubscription, pt: PlanTemplate) -> tuple[date, date]:
    start = sub.starts_at.date()
    if sub.ends_at is not None:
        end = sub.ends_at.date()
    else:
        end = start + timedelta(days=max(pt.duration_days, 1) - 1)
    return start, end


def _next_renewal_period(sub: ClientSubscription, pt: PlanTemplate) -> tuple[date, date] | None:
    """Period after current membership ends (day after ends_at)."""
    if sub.ends_at is None:
        return None
    dur = max(pt.duration_days, 1)
    next_start = sub.ends_at.date() + timedelta(days=1)
    next_end = next_start + timedelta(days=dur - 1)
    return next_start, next_end


async def create_invoice_from_subscription(
    db: AsyncSession,
    *,
    coach_id: int,
    subscription_id: int,
    allocate_reference: bool = True,
) -> tuple[Invoice | None, str]:
    """Returns (invoice, reason). reason is 'created', 'existing', 'not_found', or 'forbidden'."""
    result = await db.execute(
        select(ClientSubscription)
        .options(
            selectinload(ClientSubscription.plan_template),
            selectinload(ClientSubscription.client),
        )
        .where(ClientSubscription.id == subscription_id)
    )
    sub = result.scalar_one_or_none()
    if not sub or not sub.plan_template or not sub.client:
        return None, "not_found"
    if sub.client.coach_id != coach_id:
        return None, "forbidden"

    pt = sub.plan_template
    period_start, period_end = _period_for_current_term(sub, pt)

    dup_r = await db.execute(
        select(Invoice).where(
            Invoice.subscription_id == subscription_id,
            Invoice.invoice_period_start == period_start,
            Invoice.invoice_period_end == period_end,
        )
    )
    existing = dup_r.scalar_one_or_none()
    if existing is not None:
        return existing, "existing"

    amount, currency = _subscription_amount_currency(pt)
    ref = None
    if allocate_reference:
        ref = await allocate_next_reference(db, coach_id)

    inv = Invoice(
        client_id=sub.client_id,
        subscription_id=subscription_id,
        reference=ref,
        amount=amount,
        currency=currency,
        due_date=period_start,
        invoice_period_start=period_start,
        invoice_period_end=period_end,
        status="pending",
        notes=f"{pt.name} ({period_start.isoformat()} – {period_end.isoformat()})",
    )
    db.add(inv)
    await db.flush()
    emit_invoice_event(
        "invoice_created",
        {"invoice_id": inv.id, "client_id": inv.client_id, "source": "from_subscription"},
    )
    return inv, "created"


async def run_renewal_invoices_for_all_coaches(db: AsyncSession) -> dict[str, int]:
    """Create next-period invoices for subscriptions ending today. Returns counts."""
    today = date.today()
    created = 0
    skipped = 0

    result = await db.execute(
        select(ClientSubscription)
        .options(
            selectinload(ClientSubscription.plan_template),
            selectinload(ClientSubscription.client),
        )
        .where(
            ClientSubscription.status == "active",
            ClientSubscription.ends_at.isnot(None),
        )
    )
    subs = result.scalars().unique().all()

    for sub in subs:
        if sub.ends_at is None:
            continue
        if sub.ends_at.date() != today:
            continue
        pt = sub.plan_template
        if not pt or not sub.client:
            continue
        coach_id = sub.client.coach_id
        nxt = _next_renewal_period(sub, pt)
        if nxt is None:
            continue
        period_start, period_end = nxt

        dup = await db.execute(
            select(Invoice.id).where(
                Invoice.subscription_id == sub.id,
                Invoice.invoice_period_start == period_start,
                Invoice.invoice_period_end == period_end,
            )
        )
        if dup.scalar_one_or_none() is not None:
            skipped += 1
            continue

        amount, currency = _subscription_amount_currency(pt)
        ref = await allocate_next_reference(db, coach_id)
        inv = Invoice(
            client_id=sub.client_id,
            subscription_id=sub.id,
            reference=ref,
            amount=amount,
            currency=currency,
            due_date=period_start,
            invoice_period_start=period_start,
            invoice_period_end=period_end,
            status="pending",
            notes=f"Renewal: {pt.name} ({period_start.isoformat()} – {period_end.isoformat()})",
        )
        db.add(inv)
        await db.flush()
        emit_invoice_event(
            "invoice_created",
            {"invoice_id": inv.id, "client_id": inv.client_id, "source": "renewal_cron"},
        )
        created += 1

    return {"created": created, "skipped_duplicates": skipped}


def mark_paid_timestamp() -> datetime:
    return datetime.now(timezone.utc)
