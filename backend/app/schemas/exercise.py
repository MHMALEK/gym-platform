from typing import Literal

from pydantic import BaseModel, Field

from app.models.exercise import Exercise

ExerciseVenue = Literal["home", "commercial_gym", "both"]


class MuscleGroupRef(BaseModel):
    id: int
    code: str
    label: str


class ExerciseCreate(BaseModel):
    name: str
    description: str | None = None
    category: str | None = None
    muscle_group_ids: list[int] = Field(default_factory=list)
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
    muscle_group_ids: list[int] | None = None
    equipment: str | None = None
    venue_type: ExerciseVenue | None = None
    tips: str | None = None
    common_mistakes: str | None = None
    correct_form_cues: str | None = None
    demo_media_url: str | None = None
    thumbnail_url: str | None = None


class ExerciseRead(BaseModel):
    id: int
    coach_id: int | None
    name: str
    description: str | None
    category: str | None
    muscle_group_ids: list[int] = Field(default_factory=list)
    muscle_groups: list[MuscleGroupRef] = Field(default_factory=list)
    equipment: str | None
    venue_type: str = "both"
    tips: str | None = None
    common_mistakes: str | None = None
    correct_form_cues: str | None = None
    demo_media_url: str | None = None
    thumbnail_url: str | None = None


def exercise_to_read(ex: Exercise) -> ExerciseRead:
    groups: list[MuscleGroupRef] = []
    ids: list[int] = []
    links = list(ex.muscle_links or [])
    links.sort(
        key=lambda L: (
            L.sort_order,
            L.muscle_group.sort_order,
            L.muscle_group.label,
        )
    )
    for link in links:
        mg = link.muscle_group
        groups.append(MuscleGroupRef(id=mg.id, code=mg.code, label=mg.label))
        ids.append(mg.id)
    return ExerciseRead(
        id=ex.id,
        coach_id=ex.coach_id,
        name=ex.name,
        description=ex.description,
        category=ex.category,
        muscle_group_ids=ids,
        muscle_groups=groups,
        equipment=ex.equipment,
        venue_type=ex.venue_type,
        tips=ex.tips,
        common_mistakes=ex.common_mistakes,
        correct_form_cues=ex.correct_form_cues,
        demo_media_url=ex.demo_media_url,
        thumbnail_url=ex.thumbnail_url,
    )
