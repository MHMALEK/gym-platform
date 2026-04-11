from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class FinanceAlertItem(BaseModel):
    invoice_id: int
    client_id: int
    client_name: str
    amount: Decimal | None
    currency: str
    due_date: date | None
    days_overdue: int | None = None
    days_until_due: int | None = None


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

    invoices_paid_amount_month: Decimal
    invoices_paid_amount_30d: Decimal

    finance_overdue: list[FinanceAlertItem]
    finance_due_soon: list[FinanceAlertItem]

    active_memberships: int

    plan_templates: int
    exercises: int
    training_plans: int
