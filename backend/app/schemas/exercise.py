import json
from typing import Literal

from pydantic import BaseModel, Field

from app.models.exercise import Exercise, ExerciseVideoLink

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
    difficulty: str | None = None
    exercise_type: str | None = None
    body_parts: list[str] = Field(default_factory=list)
    secondary_muscles: list[str] = Field(default_factory=list)
    instructions: list[str] = Field(default_factory=list)
    setup_notes: str | None = None
    safety_notes: str | None = None
    source_url: str | None = None
    license_status: str | None = None


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
    difficulty: str | None = None
    exercise_type: str | None = None
    body_parts: list[str] | None = None
    secondary_muscles: list[str] | None = None
    instructions: list[str] | None = None
    setup_notes: str | None = None
    safety_notes: str | None = None
    source_url: str | None = None
    license_status: str | None = None


class ExerciseVideoLinkCreate(BaseModel):
    provider: Literal["youtube"] = "youtube"
    url: str
    title: str | None = None
    description: str | None = None
    sort_order: int | None = None
    source: Literal["manual", "seed", "generated"] = "manual"


class ExerciseVideoLinkUpdate(BaseModel):
    provider: Literal["youtube"] | None = None
    url: str | None = None
    title: str | None = None
    description: str | None = None
    sort_order: int | None = None
    source: Literal["manual", "seed", "generated"] | None = None


class ExerciseVideoLinkRead(BaseModel):
    id: int
    exercise_id: int
    provider: str
    url: str
    title: str | None = None
    description: str | None = None
    sort_order: int = 0
    source: str = "manual"


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
    external_source: str | None = None
    external_id: str | None = None
    difficulty: str | None = None
    exercise_type: str | None = None
    body_parts: list[str] = Field(default_factory=list)
    secondary_muscles: list[str] = Field(default_factory=list)
    instructions: list[str] = Field(default_factory=list)
    setup_notes: str | None = None
    safety_notes: str | None = None
    source_url: str | None = None
    license_status: str | None = None
    video_links: list[ExerciseVideoLinkRead] = Field(default_factory=list)


def encoded_list(value: list[str] | None) -> str | None:
    if value is None:
        return None
    return json.dumps([str(x).strip() for x in value if str(x).strip()])


def decoded_list(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        data = json.loads(value)
    except json.JSONDecodeError:
        return [x.strip() for x in value.splitlines() if x.strip()]
    if not isinstance(data, list):
        return []
    return [str(x).strip() for x in data if str(x).strip()]


def video_link_to_read(link: ExerciseVideoLink) -> ExerciseVideoLinkRead:
    return ExerciseVideoLinkRead(
        id=link.id,
        exercise_id=link.exercise_id,
        provider=link.provider,
        url=link.url,
        title=link.title,
        description=link.description,
        sort_order=link.sort_order,
        source=link.source,
    )


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
        if mg is None:
            continue
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
        external_source=ex.external_source,
        external_id=ex.external_id,
        difficulty=ex.difficulty,
        exercise_type=ex.exercise_type,
        body_parts=decoded_list(ex.body_parts),
        secondary_muscles=decoded_list(ex.secondary_muscles),
        instructions=decoded_list(ex.instructions),
        setup_notes=ex.setup_notes,
        safety_notes=ex.safety_notes,
        source_url=ex.source_url,
        license_status=ex.license_status,
        video_links=[video_link_to_read(link) for link in sorted(ex.video_links or [], key=lambda x: (x.sort_order, x.id))],
    )
