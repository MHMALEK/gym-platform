from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, field_validator

from app.schemas.common import ORMBase

InvoiceStatus = Literal["pending", "paid", "overdue", "cancelled"]


class ClientSummary(BaseModel):
    id: int
    name: str


class InvoiceCreate(BaseModel):
    client_id: int
    reference: str | None = None
    amount: Decimal | None = None
    currency: str = "USD"
    due_date: date | None = None
    status: InvoiceStatus = "pending"
    notes: str | None = None
    internal_notes: str | None = None
    subscription_id: int | None = None
    invoice_period_start: date | None = None
    invoice_period_end: date | None = None


class InvoiceFromSubscriptionCreate(BaseModel):
    subscription_id: int


class InvoiceUpdate(BaseModel):
    reference: str | None = None
    amount: Decimal | None = None
    currency: str | None = None
    due_date: date | None = None
    status: InvoiceStatus | None = None
    notes: str | None = None
    internal_notes: str | None = None
    paid_at: datetime | None = None
    payment_provider: str | None = None
    external_payment_id: str | None = None

    @field_validator("reference", "notes", "internal_notes", "payment_provider", "external_payment_id", mode="before")
    @classmethod
    def empty_to_none(cls, v: str | None) -> str | None:
        if v == "":
            return None
        return v


class InvoiceRead(ORMBase):
    id: int
    client_id: int
    subscription_id: int | None
    reference: str | None
    amount: Decimal | None
    currency: str
    due_date: date | None
    invoice_period_start: date | None
    invoice_period_end: date | None
    status: str
    notes: str | None
    internal_notes: str | None
    paid_at: datetime | None
    payment_provider: str | None
    external_payment_id: str | None
    created_at: datetime
    updated_at: datetime
    client: ClientSummary | None = None


class StartPaymentResponse(BaseModel):
    checkout_url: str | None
    status: str
    invoice_id: int
