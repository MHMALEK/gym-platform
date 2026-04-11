import csv
from datetime import date, datetime
from io import StringIO

from fastapi import APIRouter, HTTPException, Query, Response
from sqlalchemy import Date, cast, func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentCoach, DbSession
from app.models.client import Client
from app.models.coach import Coach
from app.models.invoice import Invoice
from app.schemas.invoice import (
    ClientSummary,
    InvoiceCreate,
    InvoiceFromSubscriptionCreate,
    InvoiceRead,
    InvoiceUpdate,
    StartPaymentResponse,
)
from app.services.invoice_billing import create_invoice_from_subscription, mark_paid_timestamp
from app.services.invoice_events import emit_invoice_event
from app.services.invoice_numbering import allocate_next_reference
from app.services.invoice_pdf import render_invoice_pdf
from app.services.payment_placeholder import NoOpPaymentProvider

router = APIRouter(prefix="/invoices", tags=["invoices"])


def _invoice_read(inv: Invoice) -> InvoiceRead:
    client_summary = None
    if inv.client is not None:
        client_summary = ClientSummary(id=inv.client.id, name=inv.client.name)
    return InvoiceRead(
        id=inv.id,
        client_id=inv.client_id,
        subscription_id=inv.subscription_id,
        reference=inv.reference,
        amount=inv.amount,
        currency=inv.currency,
        due_date=inv.due_date,
        invoice_period_start=inv.invoice_period_start,
        invoice_period_end=inv.invoice_period_end,
        status=inv.status,
        notes=inv.notes,
        internal_notes=inv.internal_notes,
        paid_at=inv.paid_at,
        payment_provider=inv.payment_provider,
        external_payment_id=inv.external_payment_id,
        created_at=inv.created_at,
        updated_at=inv.updated_at,
        client=client_summary,
    )


async def _get_invoice_for_coach(
    db: DbSession, coach_id: int, invoice_id: int
) -> Invoice | None:
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.client))
        .join(Client, Client.id == Invoice.client_id)
        .where(Invoice.id == invoice_id, Client.coach_id == coach_id)
    )
    return result.scalar_one_or_none()


@router.get("", response_model=dict)
async def list_invoices(
    coach: CurrentCoach,
    db: DbSession,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    client_id: int | None = None,
    status: str | None = None,
):
    cond = [Client.coach_id == coach.id]
    if client_id is not None:
        cond.append(Invoice.client_id == client_id)
    if status:
        cond.append(Invoice.status == status)

    count_stmt = select(func.count()).select_from(Invoice).join(Client).where(*cond)
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = (
        select(Invoice)
        .options(selectinload(Invoice.client))
        .join(Client, Client.id == Invoice.client_id)
        .where(*cond)
        .order_by(Invoice.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return {
        "items": [_invoice_read(x) for x in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/export/csv")
async def export_invoices_csv(
    coach: CurrentCoach,
    db: DbSession,
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    status: str | None = Query(None),
):
    cond = [Client.coach_id == coach.id]
    if status:
        cond.append(Invoice.status == status)
    if from_date is not None:
        cond.append(cast(Invoice.created_at, Date) >= from_date)
    if to_date is not None:
        cond.append(cast(Invoice.created_at, Date) <= to_date)

    stmt = (
        select(Invoice, Client.name)
        .join(Client, Client.id == Invoice.client_id)
        .where(*cond)
        .order_by(Invoice.created_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    buf = StringIO()
    w = csv.writer(buf)
    w.writerow(
        [
            "id",
            "client_id",
            "client_name",
            "reference",
            "amount",
            "currency",
            "due_date",
            "status",
            "paid_at",
            "created_at",
            "notes",
        ]
    )
    for inv, cname in rows:
        w.writerow(
            [
                inv.id,
                inv.client_id,
                cname,
                inv.reference or "",
                str(inv.amount) if inv.amount is not None else "",
                inv.currency,
                inv.due_date.isoformat() if inv.due_date else "",
                inv.status,
                inv.paid_at.isoformat() if inv.paid_at else "",
                inv.created_at.isoformat() if inv.created_at else "",
                (inv.notes or "").replace("\n", " ")[:500],
            ]
        )

    data = buf.getvalue()
    return Response(
        content=data.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="invoices.csv"'},
    )


@router.post("/from-subscription", response_model=InvoiceRead, status_code=201)
async def create_from_subscription(
    body: InvoiceFromSubscriptionCreate,
    coach: CurrentCoach,
    db: DbSession,
):
    inv, reason = await create_invoice_from_subscription(
        db, coach_id=coach.id, subscription_id=body.subscription_id
    )
    if reason == "not_found":
        raise HTTPException(status_code=404, detail="Subscription not found")
    if reason == "forbidden":
        raise HTTPException(status_code=403, detail="Not allowed")
    assert inv is not None
    await db.commit()
    await db.refresh(inv, ["client"])
    return _invoice_read(inv)


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: int, coach: CurrentCoach, db: DbSession):
    inv = await _get_invoice_for_coach(db, coach.id, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    cname = inv.client.name if inv.client else ""
    pdf_bytes = render_invoice_pdf(invoice=inv, coach=coach, client_name=cname)
    filename = f"invoice-{inv.reference or inv.id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{invoice_id}/start-payment", response_model=StartPaymentResponse)
async def start_payment(invoice_id: int, coach: CurrentCoach, db: DbSession):
    inv = await _get_invoice_for_coach(db, coach.id, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    provider = NoOpPaymentProvider()
    out = await provider.create_checkout_session(invoice_id, coach.id)
    return StartPaymentResponse(
        checkout_url=out.get("checkout_url"),
        status=str(out.get("status", "not_configured")),
        invoice_id=invoice_id,
    )


@router.get("/{invoice_id}", response_model=InvoiceRead)
async def get_invoice(invoice_id: int, coach: CurrentCoach, db: DbSession):
    inv = await _get_invoice_for_coach(db, coach.id, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return _invoice_read(inv)


@router.post("", response_model=InvoiceRead, status_code=201)
async def create_invoice(body: InvoiceCreate, coach: CurrentCoach, db: DbSession):
    c_result = await db.execute(
        select(Client).where(Client.id == body.client_id, Client.coach_id == coach.id)
    )
    c = c_result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")

    ref = body.reference
    if ref is None or (isinstance(ref, str) and not ref.strip()):
        ref = await allocate_next_reference(db, coach.id)

    inv = Invoice(
        client_id=body.client_id,
        subscription_id=body.subscription_id,
        reference=ref,
        amount=body.amount,
        currency=body.currency or "USD",
        due_date=body.due_date,
        invoice_period_start=body.invoice_period_start,
        invoice_period_end=body.invoice_period_end,
        status=body.status,
        notes=body.notes,
        internal_notes=body.internal_notes,
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)
    await db.refresh(inv, ["client"])
    emit_invoice_event("invoice_created", {"invoice_id": inv.id, "client_id": inv.client_id, "source": "manual"})
    return _invoice_read(inv)


@router.patch("/{invoice_id}", response_model=InvoiceRead)
async def update_invoice(
    invoice_id: int,
    body: InvoiceUpdate,
    coach: CurrentCoach,
    db: DbSession,
):
    inv = await _get_invoice_for_coach(db, coach.id, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(inv, k, v)
    if inv.status == "paid" and inv.paid_at is None:
        inv.paid_at = mark_paid_timestamp()
        emit_invoice_event(
            "invoice_marked_paid",
            {"invoice_id": inv.id, "client_id": inv.client_id},
        )
    await db.commit()
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.client))
        .where(Invoice.id == invoice_id)
    )
    inv2 = result.scalar_one()
    return _invoice_read(inv2)


@router.delete("/{invoice_id}", status_code=204)
async def delete_invoice(invoice_id: int, coach: CurrentCoach, db: DbSession):
    inv = await _get_invoice_for_coach(db, coach.id, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    await db.delete(inv)
    await db.commit()
