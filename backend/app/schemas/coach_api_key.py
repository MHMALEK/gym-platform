from datetime import datetime

from pydantic import BaseModel, Field


class CoachApiKeyCreate(BaseModel):
    label: str | None = Field(None, max_length=128)


class CoachApiKeyRead(BaseModel):
    id: int
    key_prefix: str
    label: str | None
    created_at: datetime
    last_used_at: datetime | None

    model_config = {"from_attributes": True}


class CoachApiKeyCreated(BaseModel):
    """Plaintext key is only returned once."""

    id: int
    key: str
    key_prefix: str
    label: str | None
    created_at: datetime
