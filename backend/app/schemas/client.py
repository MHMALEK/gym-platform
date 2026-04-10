from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.schemas.common import ORMBase
from app.schemas.goal_type import GoalTypeSummary


class SubscriptionPlanSummary(BaseModel):
    id: int
    name: str
    code: str | None = None
    duration_days: int | None = None
    price: Decimal | None = None
    discount_price: Decimal | None = None
    currency: str = "USD"
    image_url: str | None = None


class MembershipListSummary(BaseModel):
    """Snapshot for client lists: current membership focus."""

    plan_name: str
    plan_code: str | None = None
    ends_at: datetime | None = None
    days_remaining: int | None = None
    source: Literal["active_subscription", "designated_only"]


class LastInvoiceListSummary(BaseModel):
    id: int
    status: str
    is_paid: bool
    due_date: date | None = None
    amount: Decimal | None = None
    currency: str = "USD"
    reference: str | None = None


class ClientWorkoutItemWrite(BaseModel):
    model_config = ConfigDict(extra="ignore")

    exercise_id: int
    sort_order: int = 0
    sets: int | None = None
    reps: int | None = None
    duration_sec: int | None = None
    rest_sec: int | None = None
    notes: str | None = None


class ClientWorkoutItemRead(ClientWorkoutItemWrite):
    exercise_name: str | None = None


class ClientCoachingPlanRead(BaseModel):
    workout_plan: str | None = None
    diet_plan: str | None = None
    workout_items: list[ClientWorkoutItemRead] = Field(default_factory=list)
    updated_at: datetime | None = None


class ClientCoachingPlanUpsert(BaseModel):
    workout_plan: str | None = None
    diet_plan: str | None = None
    workout_items: list[ClientWorkoutItemWrite] | None = None


class ClientCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    notes: str | None = None
    weight_kg: Decimal | None = None
    height_cm: Decimal | None = None
    goal_type_id: int | None = None
    goal: str | None = Field(None, description="Optional details for the selected goal")
    subscription_plan_template_id: int | None = None
    status: str | None = "active"
    account_status: str | None = "good_standing"


class ClientUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None
    weight_kg: Decimal | None = None
    height_cm: Decimal | None = None
    goal_type_id: int | None = None
    goal: str | None = None
    subscription_plan_template_id: int | None = None
    status: str | None = None
    account_status: str | None = None


class ClientRead(ORMBase):
    id: int
    coach_id: int
    name: str
    email: str | None
    phone: str | None
    notes: str | None
    status: str
    weight_kg: Decimal | None
    height_cm: Decimal | None
    goal_type_id: int | None
    goal_type: GoalTypeSummary | None = None
    goal: str | None
    subscription_plan_template_id: int | None
    subscription_plan_template: SubscriptionPlanSummary | None = None
    subscription_type: str | None = None  # active membership plan name, else designated template name
    membership_summary: MembershipListSummary | None = None
    last_invoice_summary: LastInvoiceListSummary | None = None
    account_status: str
    created_at: datetime
    updated_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def registration_date(self) -> datetime:
        return self.created_at
