from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import CurrentCoach, DbSession
from app.schemas.ai_coach_chat import CoachChatRequest, CoachChatResponse
from app.services.ai_coach_chat import run_coach_chat
from app.services.coach_tool_registry import invoke_coach_tool, list_mcp_tools

router = APIRouter(prefix="/mcp", tags=["mcp"])


class McpToolCallRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    arguments: dict[str, Any] = Field(default_factory=dict)


class McpToolCallResponse(BaseModel):
    name: str
    result: dict[str, Any]


class McpToolListResponse(BaseModel):
    tools: list[dict[str, Any]]


@router.get("/tools", response_model=McpToolListResponse)
async def get_mcp_tools(_coach: CurrentCoach):
    return McpToolListResponse(tools=list_mcp_tools())


@router.post("/tools/call", response_model=McpToolCallResponse)
async def call_mcp_tool(body: McpToolCallRequest, coach: CurrentCoach, db: DbSession):
    name = body.name.strip()
    meta = {t["name"]: t for t in list_mcp_tools()}
    if name not in meta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown tool: {name}")
    allow_mutating = bool(meta[name].get("mutating"))
    try:
        result = await invoke_coach_tool(db, coach, name, body.arguments, allow_mutating=allow_mutating)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)[:500]) from e
    if isinstance(result, dict) and result.get("error") == "unknown_tool":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown tool: {name}")
    return McpToolCallResponse(name=name, result=result if isinstance(result, dict) else {"result": result})


@router.post("/assistant/chat", response_model=CoachChatResponse)
async def mcp_assistant_chat(body: CoachChatRequest, coach: CurrentCoach, db: DbSession):
    """Same coach assistant as POST /ai/coach-chat, for MCP / API-key clients."""
    msgs = [{"role": m.role, "content": m.content.strip()} for m in body.messages]
    ctx = body.context.strip() if body.context else None
    loc = (body.locale or "").strip() or None
    try:
        text = await run_coach_chat(db, coach, msgs, optional_context=ctx, locale=loc)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except RuntimeError as e:
        if "not configured" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    return CoachChatResponse(message=text)
