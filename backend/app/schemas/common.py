from pydantic import BaseModel, ConfigDict


class Message(BaseModel):
    message: str


class PaginatedMeta(BaseModel):
    total: int
    limit: int
    offset: int


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
