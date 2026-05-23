from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.client import ClientCoachingPlanRead
from app.schemas.common import ORMBase


class CoachPublicPreview(BaseModel):
    name: str
    tagline: str | None = None
    invite_code: str


class ClientBootstrapRequest(BaseModel):
    invite_code: str | None = Field(
        default=None,
        max_length=32,
        description="Required on first signup; links the client to a coach.",
    )
    name: str | None = Field(default=None, max_length=255)


class ClientBootstrapResponse(ORMBase):
    id: int
    coach_id: int
    name: str
    email: str | None
    firebase_uid: str
    created: bool
    coach_name: str


class AuthWhoamiCoach(BaseModel):
    role: Literal["coach"] = "coach"
    id: int
    name: str
    email: str


class AuthWhoamiClient(BaseModel):
    role: Literal["client"] = "client"
    id: int
    name: str
    email: str | None
    coach_id: int
    coach_name: str


class AuthWhoamiNone(BaseModel):
    role: None = None


AuthWhoamiResponse = AuthWhoamiCoach | AuthWhoamiClient | AuthWhoamiNone


class ClientMeRead(BaseModel):
    id: int
    name: str
    email: str | None
    coach_id: int
    coach_name: str
    coach_tagline: str | None = None
    status: str
    account_status: str
    coaching_plan: ClientCoachingPlanRead


class ClientPortalInvoiceRead(BaseModel):
    id: int
    reference: str | None
    amount: Decimal | None
    currency: str
    due_date: date | None
    invoice_period_start: date | None
    invoice_period_end: date | None
    status: str
    notes: str | None
    paid_at: datetime | None
    created_at: datetime
    updated_at: datetime
