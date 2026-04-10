from pydantic import BaseModel, Field

from app.schemas.common import ORMBase
from app.schemas.exercise import ExerciseRead


class TrainingPlanCreate(BaseModel):
    name: str
    description: str | None = None


class TrainingPlanUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class TrainingPlanItemWrite(BaseModel):
    exercise_id: int
    sort_order: int = 0
    sets: int | None = None
    reps: int | None = None
    duration_sec: int | None = None
    rest_sec: int | None = None
    notes: str | None = None


class TrainingPlanItemRead(ORMBase):
    id: int
    training_plan_id: int
    exercise_id: int
    sort_order: int
    sets: int | None
    reps: int | None
    duration_sec: int | None
    rest_sec: int | None
    notes: str | None
    exercise: ExerciseRead | None = None


class TrainingPlanRead(ORMBase):
    id: int
    coach_id: int | None
    name: str
    description: str | None
    source_catalog_plan_id: int | None
    items: list[TrainingPlanItemRead] = Field(default_factory=list)


class TrainingPlanSummary(ORMBase):
    id: int
    coach_id: int | None
    name: str
    description: str | None
    source_catalog_plan_id: int | None
