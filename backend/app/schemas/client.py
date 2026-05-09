from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator, model_validator

from app.constants.client_billing import CLIENT_BILLING_PREFERENCE_VALUES
from app.schemas.common import ORMBase
from app.schemas.exercise import ExerciseRead
from app.schemas.goal_type import GoalTypeSummary
from app.schemas.training_plan import WorkoutRowType


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


WorkoutBlockType = Literal["superset", "circuit", "tri_set", "giant_set", "dropset"]


class ClientWorkoutItemWrite(BaseModel):
    model_config = ConfigDict(extra="ignore")

    exercise_id: int
    sort_order: int = 0
    sets: int | None = None
    reps: int | None = None
    duration_sec: int | None = None
    rest_sec: int | None = None
    weight_kg: float | None = None
    rpe: float | None = None
    tempo: str | None = None
    notes: str | None = None
    block_id: str | None = None
    block_type: WorkoutBlockType | None = None
    row_type: WorkoutRowType = "legacy_line"
    exercise_instance_id: str | None = None

    @model_validator(mode="after")
    def block_consistency(self):
        bid = (self.block_id or "").strip() or None
        object.__setattr__(self, "block_id", bid)
        if not bid:
            object.__setattr__(self, "block_type", None)
        elif self.block_type is None:
            object.__setattr__(self, "block_type", "superset")
        return self

    @model_validator(mode="after")
    def row_structure(self):
        rt = self.row_type
        iid = (self.exercise_instance_id or "").strip() or None
        object.__setattr__(self, "exercise_instance_id", iid)
        if rt == "exercise":
            if not iid:
                raise ValueError("exercise_instance_id is required when row_type is exercise")
        elif rt == "set":
            if not iid:
                raise ValueError("exercise_instance_id is required when row_type is set")
        else:
            if iid is not None:
                object.__setattr__(self, "exercise_instance_id", None)
        return self


class ClientWorkoutItemRead(ClientWorkoutItemWrite):
    exercise_name: str | None = None
    exercise: ExerciseRead | None = None
    block_sequence: int | None = None


class DietFoodLine(BaseModel):
    model_config = ConfigDict(extra="ignore")

    description: str = Field(default="", max_length=2000)
    calories: float | None = Field(default=None, ge=0)
    protein_g: float | None = Field(default=None, ge=0)
    carbs_g: float | None = Field(default=None, ge=0)
    fat_g: float | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def strip_description(self):
        d = (self.description or "").strip()
        object.__setattr__(self, "description", d)
        return self


class DietMeal(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sort_order: int = 0
    name: str = Field(default="", max_length=200)
    notes: str | None = Field(default=None, max_length=8000)
    foods: list[DietFoodLine] = Field(default_factory=list, max_length=200)

    @model_validator(mode="after")
    def strip_meal_fields(self):
        n = (self.name or "").strip() or "Meal"
        object.__setattr__(self, "name", n)
        nt = self.notes
        if nt is not None:
            s = nt.strip()
            object.__setattr__(self, "notes", s if s else None)
        return self


CoachingProgramVenue = Literal["mixed", "home", "commercial_gym"]


class ClientCoachingPlanRead(BaseModel):
    workout_plan: str | None = None
    workout_rich_html: str | None = None
    program_venue: CoachingProgramVenue = "mixed"
    diet_plan: str | None = None
    diet_meals: list[DietMeal] = Field(default_factory=list)
    workout_items: list[ClientWorkoutItemRead] = Field(default_factory=list)
    updated_at: datetime | None = None
    assigned_training_plan_id: int | None = None
    assigned_nutrition_template_id: int | None = None


class ClientCoachingPlanUpsert(BaseModel):
    workout_plan: str | None = None
    workout_rich_html: str | None = None
    program_venue: CoachingProgramVenue | None = None
    diet_plan: str | None = None
    diet_meals: list[DietMeal] | None = Field(default=None, max_length=64)
    workout_items: list[ClientWorkoutItemWrite] | None = None
    assigned_training_plan_id: int | None = None
    assigned_nutrition_template_id: int | None = None


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
    billing_preference: str | None = Field(
        default=None,
        max_length=32,
        description="Coach-only: how they collect fees (no payment processing).",
    )
    status: str | None = "active"
    account_status: str | None = "good_standing"

    @field_validator("billing_preference", mode="before")
    @classmethod
    def normalize_billing_preference(cls, v: object) -> str | None:
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            if not s or s == "unspecified":
                return None
            if s not in CLIENT_BILLING_PREFERENCE_VALUES:
                raise ValueError("invalid billing_preference")
            return s
        raise ValueError("billing_preference must be a string or null")


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
    billing_preference: str | None = Field(default=None, max_length=32)
    status: str | None = None
    account_status: str | None = None

    @field_validator("billing_preference", mode="before")
    @classmethod
    def normalize_billing_preference_update(cls, v: object) -> str | None:
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            if not s or s == "unspecified":
                return None
            if s not in CLIENT_BILLING_PREFERENCE_VALUES:
                raise ValueError("invalid billing_preference")
            return s
        raise ValueError("billing_preference must be a string or null")


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
    billing_preference: str | None = None
    created_at: datetime
    updated_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def registration_date(self) -> datetime:
        return self.created_at
