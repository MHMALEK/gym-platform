from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ChatMessageRead(BaseModel):
    id: int
    sender_type: Literal["coach", "client"]
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatMessageListResponse(BaseModel):
    items: list[ChatMessageRead]


class ChatMessageCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=8000)

    @field_validator("body")
    @classmethod
    def strip_body(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Message cannot be empty.")
        return s


class ChatMessagePostResponse(BaseModel):
    message: ChatMessageRead
