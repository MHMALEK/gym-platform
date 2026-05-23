"""Client-facing reminders and promotions (computed from existing data)."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.client import Client
from app.models.client_coaching_plan import ClientCoachingPlan
from app.models.client_subscription import ClientSubscription
from app.models.invoice import Invoice
from app.models.plan_template import PlanTemplate
from app.schemas.client_feed import ClientPromotionRead, ClientReminderRead

DUE_SOON_DAYS = 7
MEMBERSHIP_ENDING_DAYS = 14
PLAN_UPDATED_DAYS = 7


def _days_until(d: date) -> int:
    return (d - date.today()).days


def _invoice_effective_status(inv: Invoice) -> str:
    if inv.status == "paid" or inv.status == "cancelled":
        return inv.status
    if inv.due_date and inv.due_date < date.today() and inv.status == "pending":
        return "overdue"
    return inv.status


async def build_client_reminders(db, client: Client) -> list[ClientReminderRead]:
    out: list[ClientReminderRead] = []

    inv_result = await db.execute(
        select(Invoice)
        .where(Invoice.client_id == client.id)
        .order_by(Invoice.due_date.asc().nullslast(), Invoice.created_at.desc())
    )
    for inv in inv_result.scalars().all():
        eff = _invoice_effective_status(inv)
        ref = inv.reference or f"#{inv.id}"
        if eff == "overdue":
            out.append(
                ClientReminderRead(
                    id=f"invoice-{inv.id}-overdue",
                    kind="invoice_overdue",
                    title=f"Invoice {ref} is overdue",
                    body=f"Payment was due {inv.due_date.isoformat() if inv.due_date else '—'}.",
                    severity="high",
                    action="invoices",
                    related_id=inv.id,
                    due_at=inv.due_date,
                )
            )
        elif eff == "pending" and inv.due_date:
            days = _days_until(inv.due_date)
            if 0 <= days <= DUE_SOON_DAYS:
                out.append(
                    ClientReminderRead(
                        id=f"invoice-{inv.id}-due-soon",
                        kind="invoice_due_soon",
                        title=f"Invoice {ref} due in {days} day{'s' if days != 1 else ''}",
                        body=f"Due date: {inv.due_date.isoformat()}.",
                        severity="medium" if days > 2 else "high",
                        action="invoices",
                        related_id=inv.id,
                        due_at=inv.due_date,
                    )
                )

    sub_result = await db.execute(
        select(ClientSubscription)
        .options(selectinload(ClientSubscription.plan_template))
        .where(ClientSubscription.client_id == client.id, ClientSubscription.status == "active")
    )
    for sub in sub_result.scalars().all():
        if sub.ends_at is None:
            continue
        end_date = sub.ends_at.date() if isinstance(sub.ends_at, datetime) else sub.ends_at
        days = _days_until(end_date)
        if days < 0:
            continue
        if days <= MEMBERSHIP_ENDING_DAYS:
            plan_name = sub.plan_template.name if sub.plan_template else "Membership"
            out.append(
                ClientReminderRead(
                    id=f"membership-{sub.id}-ending",
                    kind="membership_ending",
                    title=f"{plan_name} ends in {days} day{'s' if days != 1 else ''}",
                    body=f"Your membership ends on {end_date.isoformat()}. Contact your coach to renew.",
                    severity="medium" if days > 3 else "high",
                    action="promotions",
                    related_id=sub.plan_template_id,
                    due_at=end_date,
                )
            )

    plan_result = await db.execute(
        select(ClientCoachingPlan).where(ClientCoachingPlan.client_id == client.id)
    )
    cp = plan_result.scalar_one_or_none()
    if cp and cp.updated_at:
        updated = cp.updated_at.replace(tzinfo=None) if cp.updated_at.tzinfo else cp.updated_at
        age = datetime.utcnow() - updated
        if age <= timedelta(days=PLAN_UPDATED_DAYS):
            out.append(
                ClientReminderRead(
                    id=f"plan-updated-{cp.id}",
                    kind="plan_updated",
                    title="Your coach updated your plan",
                    body="Check your workout and nutrition tabs for the latest program.",
                    severity="low",
                    action="plans",
                    related_id=None,
                    due_at=None,
                )
            )

    if client.account_status == "payment_issue":
        out.append(
            ClientReminderRead(
                id="account-payment-issue",
                kind="payment_issue",
                title="Payment issue on your account",
                body="Please review open invoices or message your coach.",
                severity="high",
                action="invoices",
                related_id=None,
                due_at=None,
            )
        )

    severity_rank = {"high": 0, "medium": 1, "low": 2}
    out.sort(key=lambda r: (severity_rank.get(r.severity, 9), r.due_at or date.max))
    return out


def _savings_pct(price: Decimal | None, discount: Decimal | None) -> int | None:
    if price is None or discount is None or price <= 0 or discount >= price:
        return None
    return int(round(float((price - discount) / price * 100)))


async def build_client_promotions(db, client: Client) -> list[ClientPromotionRead]:
    active_sub_plan_ids: set[int] = set()
    sub_result = await db.execute(
        select(ClientSubscription.plan_template_id).where(
            ClientSubscription.client_id == client.id,
            ClientSubscription.status == "active",
        )
    )
    for row in sub_result.all():
        if row[0] is not None:
            active_sub_plan_ids.add(row[0])

    pt_result = await db.execute(
        select(PlanTemplate)
        .where(
            PlanTemplate.coach_id == client.coach_id,
            PlanTemplate.is_active.is_(True),
        )
        .order_by(PlanTemplate.sort_order, PlanTemplate.name)
    )
    out: list[ClientPromotionRead] = []
    seen: set[int] = set()

    def _append_promotion(pt: PlanTemplate, *, recommended: bool = False) -> None:
        if pt.id in seen:
            return
        has_discount = (
            pt.discount_price is not None
            and pt.price is not None
            and pt.discount_price < pt.price
        )
        body = pt.description
        if has_discount:
            pct = _savings_pct(pt.price, pt.discount_price)
            save = f" Save {pct}%." if pct else ""
            body = (body or "Limited-time membership offer.") + save
        elif recommended:
            body = body or "Your coach recommended this plan for you."
        elif body is None:
            body = f"{pt.duration_days}-day membership plan from your coach."
        out.append(
            ClientPromotionRead(
                id=pt.id,
                title=pt.name,
                body=body,
                price=pt.price,
                discount_price=pt.discount_price if has_discount else None,
                currency=pt.currency,
                savings_pct=_savings_pct(pt.price, pt.discount_price),
                code=pt.code,
                duration_days=pt.duration_days,
                is_current_plan=pt.id in active_sub_plan_ids,
            )
        )
        seen.add(pt.id)

    if client.subscription_plan_template_id:
        designated = await db.get(PlanTemplate, client.subscription_plan_template_id)
        if designated and designated.is_active and designated.coach_id == client.coach_id:
            if designated.id not in active_sub_plan_ids:
                _append_promotion(designated, recommended=True)

    for pt in pt_result.scalars().all():
        if pt.id in active_sub_plan_ids:
            continue
        has_discount = (
            pt.discount_price is not None
            and pt.price is not None
            and pt.discount_price < pt.price
        )
        if not has_discount:
            continue
        _append_promotion(pt)

    return out
