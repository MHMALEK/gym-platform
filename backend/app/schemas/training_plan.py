from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.exercise import Exercise
from app.schemas.common import ORMBase
from app.schemas.exercise import ExerciseRead, exercise_to_read

PlanVenue = Literal["home", "commercial_gym", "mixed"]

WorkoutBlockType = Literal["superset", "circuit", "tri_set", "giant_set", "dropset"]

WorkoutRowType = Literal["legacy_line", "exercise", "set"]


class TrainingPlanCreate(BaseModel):
    name: str
    description: str | None = None
    venue_type: PlanVenue = "mixed"
    workout_rich_html: str | None = None


class TrainingPlanUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    venue_type: PlanVenue | None = None
    workout_rich_html: str | None = None


class TrainingPlanItemWrite(BaseModel):
    exercise_id: int
    sort_order: int = 0
    sets: int | None = None
    reps: int | None = None
    duration_sec: int | None = None
    rest_sec: int | None = None
    # Coaching primitives. weight_kg is the load in kilograms; rpe is 0–10
    # (typically 0.5 increments); tempo is freeform like "3-1-1-0".
    weight_kg: float | None = None
    rpe: float | None = None
    tempo: str | None = None
    notes: str | None = None
    block_id: str | None = None
    block_type: WorkoutBlockType | None = None
    row_type: WorkoutRowType = "legacy_line"
    exercise_instance_id: str | None = None

    @field_validator("rpe")
    @classmethod
    def _clamp_rpe(cls, v: float | None) -> float | None:
        if v is None:
            return None
        if v < 0 or v > 10:
            raise ValueError("rpe must be between 0 and 10")
        return v

    @field_validator("weight_kg")
    @classmethod
    def _non_negative_weight(cls, v: float | None) -> float | None:
        if v is None:
            return None
        if v < 0:
            raise ValueError("weight_kg must be >= 0")
        return v

    @field_validator("tempo")
    @classmethod
    def _trim_tempo(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s if s else None

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


class TrainingPlanItemRead(ORMBase):
    id: int
    training_plan_id: int
    exercise_id: int
    sort_order: int
    sets: int | None
    reps: int | None
    duration_sec: int | None
    rest_sec: int | None
    weight_kg: float | None = None
    rpe: float | None = None
    tempo: str | None = None
    notes: str | None
    block_id: str | None = None
    block_type: str | None = None
    block_sequence: int | None = None
    row_type: str = "legacy_line"
    exercise_instance_id: str | None = None
    exercise: ExerciseRead | None = None

    @field_validator("exercise", mode="before")
    @classmethod
    def _coerce_exercise_from_orm(cls, v: Any) -> Any:
        """ORM loads `exercise` as a SQLAlchemy model; map it to ExerciseRead for the API."""
        if v is None or isinstance(v, ExerciseRead):
            return v
        if isinstance(v, Exercise):
            return exercise_to_read(v)
        return v


class TrainingPlanRead(ORMBase):
    id: int
    coach_id: int | None
    name: str
    description: str | None
    workout_rich_html: str | None = None
    source_catalog_plan_id: int | None
    venue_type: str = "mixed"
    items: list[TrainingPlanItemRead] = Field(default_factory=list)


class TrainingPlanSummary(ORMBase):
    id: int
    coach_id: int | None
    name: str
    description: str | None
    workout_rich_html: str | None = None
    source_catalog_plan_id: int | None
    venue_type: str = "mixed"
