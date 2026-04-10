from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentCoach, DbSession
from app.models.client import Client
from app.models.invoice import Invoice
from app.schemas.invoice import ClientSummary, InvoiceCreate, InvoiceRead, InvoiceUpdate

router = APIRouter(prefix="/invoices", tags=["invoices"])


def _invoice_read(inv: Invoice) -> InvoiceRead:
    client_summary = None
    if inv.client is not None:
        client_summary = ClientSummary(id=inv.client.id, name=inv.client.name)
    return InvoiceRead(
        id=inv.id,
        client_id=inv.client_id,
        reference=inv.reference,
        amount=inv.amount,
        currency=inv.currency,
        due_date=inv.due_date,
        status=inv.status,
        notes=inv.notes,
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
    inv = Invoice(
        client_id=body.client_id,
        reference=body.reference,
        amount=body.amount,
        currency=body.currency or "USD",
        due_date=body.due_date,
        status=body.status,
        notes=body.notes,
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)
    await db.refresh(inv, ["client"])
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
