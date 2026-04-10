from pydantic import BaseModel, ConfigDict


class MuscleGroupRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    label: str
    sort_order: int
    is_active: bool
