from typing import Literal

from pydantic import BaseModel, Field


class CoachChatMessageIn(BaseModel):
    role: Literal["user", "assistant"] = "user"
    content: str = Field(..., min_length=1, max_length=16_000)


class CoachChatRequest(BaseModel):
    messages: list[CoachChatMessageIn] = Field(..., min_length=1, max_length=32)
    context: str | None = Field(
        None,
        max_length=4000,
        description="Optional session context from the client; appended to the system prompt.",
    )


class CoachChatResponse(BaseModel):
    message: str = Field(..., min_length=1)
