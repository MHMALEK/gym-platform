from fastapi import APIRouter, HTTPException, Query, Response
from sqlalchemy import func, select

from app.api.clients import _enrich_client_workout_items
from app.api.deps import CurrentClient, DbSession
from app.models.client_coaching_plan import ClientCoachingPlan
from app.models.coach import Coach
from app.models.invoice import Invoice
from app.schemas.auth_session import ClientMeRead, ClientPortalInvoiceRead
from app.schemas.client import ClientCoachingPlanRead
from app.schemas.client_chat import ChatMessageCreate, ChatMessageListResponse, ChatMessagePostResponse, ChatMessageRead
from app.services.client_chat import (
    CHAT_MESSAGE_MAX_LEN,
    append_client_message,
    ensure_thread,
    get_thread_for_coach_client,
    list_messages,
)
from app.services.diet_meals_json import parse_diet_meals_raw
from app.services.invoice_pdf import render_invoice_pdf

router = APIRouter(prefix="/client", tags=["client-portal"])


async def _coaching_plan_read(db: DbSession, client_id: int) -> ClientCoachingPlanRead:
    result = await db.execute(select(ClientCoachingPlan).where(ClientCoachingPlan.client_id == client_id))
    row = result.scalar_one_or_none()
    if not row:
        return ClientCoachingPlanRead(
            workout_plan=None,
            workout_rich_html=None,
            program_venue="mixed",
            diet_plan=None,
            diet_meals=[],
            workout_items=[],
            updated_at=None,
            assigned_training_plan_id=None,
            assigned_nutrition_template_id=None,
        )
    items = await _enrich_client_workout_items(db, row.workout_items_json)
    diet_meals = parse_diet_meals_raw(row.diet_meals_json)
    pv = row.program_venue if row.program_venue in ("mixed", "home", "commercial_gym") else "mixed"
    return ClientCoachingPlanRead(
        workout_plan=row.workout_plan,
        workout_rich_html=row.workout_rich_html,
        program_venue=pv,  # type: ignore[arg-type]
        diet_plan=row.diet_plan,
        diet_meals=diet_meals,
        workout_items=items,
        updated_at=row.updated_at,
        assigned_training_plan_id=row.assigned_training_plan_id,
        assigned_nutrition_template_id=row.assigned_nutrition_template_id,
    )


def _client_invoice_read(inv: Invoice) -> ClientPortalInvoiceRead:
    return ClientPortalInvoiceRead(
        id=inv.id,
        reference=inv.reference,
        amount=inv.amount,
        currency=inv.currency,
        due_date=inv.due_date,
        invoice_period_start=inv.invoice_period_start,
        invoice_period_end=inv.invoice_period_end,
        status=inv.status,
        notes=inv.notes,
        paid_at=inv.paid_at,
        created_at=inv.created_at,
        updated_at=inv.updated_at,
    )


@router.get("/me", response_model=ClientMeRead)
async def read_client_me(client: CurrentClient, db: DbSession):
    coach_result = await db.execute(select(Coach).where(Coach.id == client.coach_id))
    coach = coach_result.scalar_one()
    coaching_plan = await _coaching_plan_read(db, client.id)
    return ClientMeRead(
        id=client.id,
        name=client.name,
        email=client.email,
        coach_id=client.coach_id,
        coach_name=coach.name,
        coach_tagline=coach.tagline,
        status=client.status,
        account_status=client.account_status,
        coaching_plan=coaching_plan,
    )


@router.get("/invoices", response_model=dict)
async def list_client_invoices(
    client: CurrentClient,
    db: DbSession,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: str | None = None,
):
    cond = [Invoice.client_id == client.id]
    if status:
        cond.append(Invoice.status == status)
    total = (await db.execute(select(func.count()).select_from(Invoice).where(*cond))).scalar_one()
    result = await db.execute(
        select(Invoice)
        .where(*cond)
        .order_by(Invoice.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = result.scalars().all()
    return {
        "items": [_client_invoice_read(x) for x in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/invoices/{invoice_id}", response_model=ClientPortalInvoiceRead)
async def get_client_invoice(invoice_id: int, client: CurrentClient, db: DbSession):
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.client_id == client.id)
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return _client_invoice_read(inv)


@router.get("/invoices/{invoice_id}/pdf")
async def download_client_invoice_pdf(invoice_id: int, client: CurrentClient, db: DbSession):
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.client_id == client.id)
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    coach_result = await db.execute(select(Coach).where(Coach.id == client.coach_id))
    coach = coach_result.scalar_one()
    pdf_bytes = render_invoice_pdf(invoice=inv, coach=coach, client_name=client.name)
    filename = f"invoice-{inv.reference or inv.id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/messages", response_model=ChatMessageListResponse)
async def list_client_messages(
    client: CurrentClient,
    db: DbSession,
    limit: int = Query(100, ge=1, le=200),
):
    thread = await get_thread_for_coach_client(db, coach_id=client.coach_id, client_id=client.id)
    if not thread:
        return ChatMessageListResponse(items=[])
    rows = await list_messages(db, thread_id=thread.id, limit=limit, after_id=None)
    return ChatMessageListResponse(items=[ChatMessageRead.model_validate(m) for m in rows])


@router.post("/messages", response_model=ChatMessagePostResponse, status_code=201)
async def post_client_message(
    client: CurrentClient,
    db: DbSession,
    body: ChatMessageCreate,
):
    if len(body.body) > CHAT_MESSAGE_MAX_LEN:
        raise HTTPException(
            status_code=400,
            detail=f"Message too long (max {CHAT_MESSAGE_MAX_LEN} characters).",
        )
    thread = await ensure_thread(db, coach_id=client.coach_id, client_id=client.id)
    msg = await append_client_message(db, thread_id=thread.id, body=body.body)
    await db.commit()
    return ChatMessagePostResponse(message=ChatMessageRead.model_validate(msg))
