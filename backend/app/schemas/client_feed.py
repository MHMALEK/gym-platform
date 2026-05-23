from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel


class ClientReminderRead(BaseModel):
    id: str
    kind: Literal[
        "invoice_overdue",
        "invoice_due_soon",
        "membership_ending",
        "plan_updated",
        "payment_issue",
    ]
    title: str
    body: str
    severity: Literal["high", "medium", "low"] = "medium"
    action: Literal["invoices", "plans", "messages", "promotions"] | None = None
    related_id: int | None = None
    due_at: date | None = None


class ClientPromotionRead(BaseModel):
    id: int
    title: str
    body: str | None = None
    price: Decimal | None = None
    discount_price: Decimal | None = None
    currency: str = "USD"
    savings_pct: int | None = None
    code: str | None = None
    duration_days: int | None = None
    is_current_plan: bool = False


class ClientReminderListResponse(BaseModel):
    items: list[ClientReminderRead]


class ClientPromotionListResponse(BaseModel):
    items: list[ClientPromotionRead]
