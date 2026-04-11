"""Single definition of overdue / open invoice semantics for API, dashboard, and exports."""

from datetime import date


def invoice_is_overdue(*, status: str, due_date: date | None, today: date | None = None) -> bool:
    """Overdue if explicitly marked, or pending with past due_date."""
    t = today or date.today()
    if status == "overdue":
        return True
    if status == "pending" and due_date is not None and due_date < t:
        return True
    return False


def unpaid_invoice_statuses() -> tuple[str, ...]:
    return ("pending", "overdue")
