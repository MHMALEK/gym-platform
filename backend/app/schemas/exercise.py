from pydantic import BaseModel

from app.schemas.common import ORMBase


class ExerciseCreate(BaseModel):
    name: str
    description: str | None = None
    category: str | None = None
    muscle_groups: str | None = None
    equipment: str | None = None


class ExerciseUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    muscle_groups: str | None = None
    equipment: str | None = None


class ExerciseRead(ORMBase):
    id: int
    coach_id: int | None
    name: str
    description: str | None
    category: str | None
    muscle_groups: str | None
    equipment: str | None
