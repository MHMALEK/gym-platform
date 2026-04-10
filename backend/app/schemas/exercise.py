from typing import Literal

from pydantic import BaseModel

from app.schemas.common import ORMBase

ExerciseVenue = Literal["home", "commercial_gym", "both"]


class ExerciseCreate(BaseModel):
    name: str
    description: str | None = None
    category: str | None = None
    muscle_groups: str | None = None
    equipment: str | None = None
    venue_type: ExerciseVenue = "both"
    tips: str | None = None
    common_mistakes: str | None = None
    correct_form_cues: str | None = None
    demo_media_url: str | None = None
    thumbnail_url: str | None = None


class ExerciseUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    muscle_groups: str | None = None
    equipment: str | None = None
    venue_type: ExerciseVenue | None = None
    tips: str | None = None
    common_mistakes: str | None = None
    correct_form_cues: str | None = None
    demo_media_url: str | None = None
    thumbnail_url: str | None = None


class ExerciseRead(ORMBase):
    id: int
    coach_id: int | None
    name: str
    description: str | None
    category: str | None
    muscle_groups: str | None
    equipment: str | None
    venue_type: str = "both"
    tips: str | None = None
    common_mistakes: str | None = None
    correct_form_cues: str | None = None
    demo_media_url: str | None = None
    thumbnail_url: str | None = None
