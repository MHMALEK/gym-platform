from datetime import datetime

from pydantic import BaseModel, Field


class WorkoutSetLog(BaseModel):
    set_number: int = Field(ge=1)
    reps: int | None = None
    weight_kg: float | None = None
    completed: bool = True


class WorkoutEntryLog(BaseModel):
    exercise_id: int | None = None
    exercise_name: str
    sort_order: int = 0
    prescribed_sets: int | None = None
    prescribed_reps: int | None = None
    sets: list[WorkoutSetLog] = Field(default_factory=list)
    completed: bool = False
    notes: str | None = None


class ClientWorkoutSessionCreate(BaseModel):
    entries: list[WorkoutEntryLog] = Field(default_factory=list)
    notes: str | None = None
    started_at: datetime | None = None
    complete: bool = True


class ClientWorkoutSessionUpdate(BaseModel):
    entries: list[WorkoutEntryLog] | None = None
    notes: str | None = None
    complete: bool | None = None


class ClientWorkoutSessionRead(BaseModel):
    id: int
    started_at: datetime
    completed_at: datetime | None
    notes: str | None
    entries: list[WorkoutEntryLog]
    exercise_count: int
    completed_exercise_count: int
    created_at: datetime


class ClientWorkoutSessionListResponse(BaseModel):
    items: list[ClientWorkoutSessionRead]
    total: int
    limit: int
    offset: int
