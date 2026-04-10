import asyncio
from datetime import date

from fastapi import APIRouter
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentCoach, DbSession
from app.models.client import Client
from app.models.client_subscription import ClientSubscription
from app.models.coach import Coach
from app.models.exercise import Exercise
from app.models.invoice import Invoice
from app.models.plan_template import PlanTemplate
from app.models.training_plan import TrainingPlan
from app.schemas.dashboard import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


async def build_dashboard_summary(coach: Coach, db: AsyncSession) -> DashboardSummary:
    cid = coach.id
    today = date.today()

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

    invoices_overdue = (
        select(func.count())
        .select_from(Invoice)
        .join(Client, Client.id == Invoice.client_id)
        .where(
            Client.coach_id == cid,
            Invoice.status == "pending",
            Invoice.due_date.isnot(None),
            Invoice.due_date < today,
        )
    )

    pending_amount = (
        select(func.coalesce(func.sum(Invoice.amount), 0))
        .select_from(Invoice)
        .join(Client, Client.id == Invoice.client_id)
        .where(Client.coach_id == cid, Invoice.status == "pending")
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
        scalar(active_memberships),
        scalar(plan_templates),
        scalar(exercises),
        scalar(training_plans),
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
        active_memberships=int(am),
        plan_templates=int(pt),
        exercises=int(ex),
        training_plans=int(tp),
    )


@router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(coach: CurrentCoach, db: DbSession) -> DashboardSummary:
    return await build_dashboard_summary(coach, db)
