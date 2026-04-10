from pydantic import BaseModel

from app.schemas.common import ORMBase


class GoalTypeRead(ORMBase):
    id: int
    code: str
    label: str
    sort_order: int
    is_active: bool


class GoalTypeSummary(BaseModel):
    id: int
    code: str
    label: str
