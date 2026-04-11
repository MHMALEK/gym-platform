import asyncio
from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter
from sqlalchemy import Date, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentCoach, DbSession
from app.models.client import Client
from app.models.client_subscription import ClientSubscription
from app.models.coach import Coach
from app.models.exercise import Exercise
from app.models.invoice import Invoice
from app.models.plan_template import PlanTemplate
from app.models.training_plan import TrainingPlan
from app.schemas.dashboard import DashboardSummary, FinanceAlertItem

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


async def build_dashboard_summary(coach: Coach, db: AsyncSession) -> DashboardSummary:
    cid = coach.id
    today = date.today()
    week_end = today + timedelta(days=7)
    month_start = date(today.year, today.month, 1)
    d30 = today - timedelta(days=30)

    async def scalar(stmt):
        return (await db.execute(stmt)).scalar_one()

    clients_total = select(func.count()).select_from(Client).where(Client.coach_id == cid)
    clients_active = select(func.count()).select_from(Client).where(
        Client.coach_id == cid, Client.status == "active"
    )
    clients_inactive = select(func.count()).select_from(Client).where(
        Client.coach_id == cid, Client.status == "inactive"
    )
    clients_archived = select(func.count()).select_from(Client).where(
        Client.coach_id == cid, Client.status == "archived"
    )

    invoices_total = (
        select(func.count())
        .select_from(Invoice)
        .join(Client, Client.id == Invoice.client_id)
        .where(Client.coach_id == cid)
    )

    invoices_pending = (
        select(func.count())
        .select_from(Invoice)
        .join(Client, Client.id == Invoice.client_id)
        .where(Client.coach_id == cid, Invoice.status == "pending")
    )

    overdue_cond = or_(
        Invoice.status == "overdue",
        (Invoice.status == "pending")
        & (Invoice.due_date.isnot(None))
        & (Invoice.due_date < today),
    )

    invoices_overdue = (
        select(func.count())
        .select_from(Invoice)
        .join(Client, Client.id == Invoice.client_id)
        .where(Client.coach_id == cid)
        .where(overdue_cond)
    )

    pending_amount = (
        select(func.coalesce(func.sum(Invoice.amount), 0))
        .select_from(Invoice)
        .join(Client, Client.id == Invoice.client_id)
        .where(Client.coach_id == cid, Invoice.status == "pending")
    )

    paid_ts = func.coalesce(Invoice.paid_at, Invoice.updated_at)

    paid_month = (
        select(func.coalesce(func.sum(Invoice.amount), 0))
        .select_from(Invoice)
        .join(Client, Client.id == Invoice.client_id)
        .where(Client.coach_id == cid, Invoice.status == "paid")
        .where(cast(paid_ts, Date) >= month_start)
        .where(cast(paid_ts, Date) <= today)
    )

    paid_30d = (
        select(func.coalesce(func.sum(Invoice.amount), 0))
        .select_from(Invoice)
        .join(Client, Client.id == Invoice.client_id)
        .where(Client.coach_id == cid, Invoice.status == "paid")
        .where(cast(paid_ts, Date) >= d30)
        .where(cast(paid_ts, Date) <= today)
    )

    active_memberships = (
        select(func.count())
        .select_from(ClientSubscription)
        .join(Client, Client.id == ClientSubscription.client_id)
        .where(Client.coach_id == cid, ClientSubscription.status == "active")
    )

    plan_templates = select(func.count()).select_from(PlanTemplate).where(PlanTemplate.coach_id == cid)

    exercises = select(func.count()).select_from(Exercise).where(Exercise.coach_id == cid)

    training_plans = select(func.count()).select_from(TrainingPlan).where(TrainingPlan.coach_id == cid)

    (
        ct,
        ca,
        ci,
        car,
        it,
        ip,
        io,
        pa,
        pm,
        p30,
        am,
        pt,
        ex,
        tp,
    ) = await asyncio.gather(
        scalar(clients_total),
        scalar(clients_active),
        scalar(clients_inactive),
        scalar(clients_archived),
        scalar(invoices_total),
        scalar(invoices_pending),
        scalar(invoices_overdue),
        scalar(pending_amount),
        scalar(paid_month),
        scalar(paid_30d),
        scalar(active_memberships),
        scalar(plan_templates),
        scalar(exercises),
        scalar(training_plans),
    )

    overdue_rows = await db.execute(
        select(Invoice, Client.name)
        .join(Client, Client.id == Invoice.client_id)
        .where(Client.coach_id == cid)
        .where(overdue_cond)
        .order_by(Invoice.due_date.asc().nullslast())
        .limit(10)
    )
    finance_overdue: list[FinanceAlertItem] = []
    for inv, cname in overdue_rows.all():
        d_o = None
        if inv.due_date is not None:
            d_o = (today - inv.due_date).days
        finance_overdue.append(
            FinanceAlertItem(
                invoice_id=inv.id,
                client_id=inv.client_id,
                client_name=cname,
                amount=inv.amount,
                currency=inv.currency,
                due_date=inv.due_date,
                days_overdue=d_o,
            )
        )

    due_soon_rows = await db.execute(
        select(Invoice, Client.name)
        .join(Client, Client.id == Invoice.client_id)
        .where(Client.coach_id == cid)
        .where(Invoice.status == "pending")
        .where(Invoice.due_date.isnot(None))
        .where(Invoice.due_date >= today)
        .where(Invoice.due_date <= week_end)
        .order_by(Invoice.due_date.asc())
        .limit(10)
    )
    finance_due_soon: list[FinanceAlertItem] = []
    for inv, cname in due_soon_rows.all():
        d_u = None
        if inv.due_date is not None:
            d_u = (inv.due_date - today).days
        finance_due_soon.append(
            FinanceAlertItem(
                invoice_id=inv.id,
                client_id=inv.client_id,
                client_name=cname,
                amount=inv.amount,
                currency=inv.currency,
                due_date=inv.due_date,
                days_until_due=d_u,
            )
        )

    return DashboardSummary(
        clients_total=int(ct),
        clients_active=int(ca),
        clients_inactive=int(ci),
        clients_archived=int(car),
        invoices_total=int(it),
        invoices_pending=int(ip),
        invoices_overdue=int(io),
        invoices_pending_amount=pa,
        invoices_paid_amount_month=Decimal(pm) if pm is not None else Decimal(0),
        invoices_paid_amount_30d=Decimal(p30) if p30 is not None else Decimal(0),
        finance_overdue=finance_overdue,
        finance_due_soon=finance_due_soon,
        active_memberships=int(am),
        plan_templates=int(pt),
        exercises=int(ex),
        training_plans=int(tp),
    )


@router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(coach: CurrentCoach, db: DbSession) -> DashboardSummary:
    return await build_dashboard_summary(coach, db)
