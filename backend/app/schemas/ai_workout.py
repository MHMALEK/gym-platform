from typing import Literal

from pydantic import BaseModel, Field


class ChatMessageIn(BaseModel):
    role: Literal["user", "assistant"] = "user"
    content: str = Field(..., min_length=1, max_length=12_000)


class TrainingPlanDraftRequest(BaseModel):
    """Chat-only draft: last user message should describe the desired workout."""

    messages: list[ChatMessageIn] = Field(..., min_length=1, max_length=16)
    venue_type: Literal["home", "commercial_gym", "mixed"] = "mixed"


class WorkoutDraftLineIn(BaseModel):
    exercise_name: str = Field(..., min_length=1, max_length=240)
    sets: int | None = Field(default=None, ge=0, le=99)
    reps: int | None = Field(default=None, ge=0, le=9999)
    duration_sec: int | None = Field(default=None, ge=0, le=86_400)
    rest_sec: int | None = Field(default=None, ge=0, le=3600)
    notes: str | None = Field(default=None, max_length=2000)


class WorkoutDraftFromLLM(BaseModel):
    """Shape the model must return when using JSON object mode."""

    plan_name: str = Field(..., min_length=1, max_length=200)
    plan_description: str | None = Field(default=None, max_length=2000)
    assistant_summary: str | None = Field(default=None, max_length=2000)
    items: list[WorkoutDraftLineIn] = Field(..., min_length=1, max_length=60)


class ExerciseIdMappingRow(BaseModel):
    """One draft line mapped to a catalog row (second LLM step)."""

    line_index: int = Field(..., ge=0, le=127)
    exercise_id: int | None = Field(default=None)


class ExerciseIdMappingFromLLM(BaseModel):
    mappings: list[ExerciseIdMappingRow] = Field(..., min_length=1, max_length=64)


class ExerciseCandidateOut(BaseModel):
    id: int
    name: str


class UnresolvedExerciseOut(BaseModel):
    requested_name: str
    candidates: list[ExerciseCandidateOut] = Field(default_factory=list)


class ResolvedPlanLineOut(BaseModel):
    """One row compatible with `workoutLinesFromApiItems` on the frontend."""

    exercise_id: int
    sort_order: int
    sets: int | None = None
    reps: int | None = None
    duration_sec: int | None = None
    rest_sec: int | None = None
    weight_kg: float | None = None
    rpe: float | None = None
    tempo: str | None = None
    notes: str | None = None
    block_id: str | None = None
    block_type: str | None = None
    row_type: str = "legacy_line"
    exercise_instance_id: str | None = None
    exercise: dict = Field(default_factory=dict)


class TrainingPlanDraftResponse(BaseModel):
    plan_name: str
    plan_description: str | None = None
    assistant_summary: str | None = None
    lines: list[ResolvedPlanLineOut] = Field(default_factory=list)
    unresolved: list[UnresolvedExerciseOut] = Field(default_factory=list)
