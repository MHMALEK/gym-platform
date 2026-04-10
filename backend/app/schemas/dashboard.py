from decimal import Decimal

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    """Coach-scoped counts for the home dashboard."""

    clients_total: int
    clients_active: int
    clients_inactive: int
    clients_archived: int

    invoices_total: int
    invoices_pending: int
    invoices_overdue: int
    invoices_pending_amount: Decimal

    active_memberships: int

    plan_templates: int
    exercises: int
    training_plans: int
