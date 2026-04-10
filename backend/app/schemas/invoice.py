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


class InvoiceUpdate(BaseModel):
    reference: str | None = None
    amount: Decimal | None = None
    currency: str | None = None
    due_date: date | None = None
    status: InvoiceStatus | None = None
    notes: str | None = None

    @field_validator("reference", "notes", mode="before")
    @classmethod
    def empty_to_none(cls, v: str | None) -> str | None:
        if v == "":
            return None
        return v


class InvoiceRead(ORMBase):
    id: int
    client_id: int
    reference: str | None
    amount: Decimal | None
    currency: str
    due_date: date | None
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime
    client: ClientSummary | None = None
