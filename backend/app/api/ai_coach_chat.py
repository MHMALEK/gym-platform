from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentCoach, DbSession
from app.schemas.ai_coach_chat import CoachChatRequest, CoachChatResponse
from app.services.ai_coach_chat import run_coach_chat

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/coach-chat", response_model=CoachChatResponse)
async def post_coach_chat(body: CoachChatRequest, coach: CurrentCoach, db: DbSession):
    msgs = [{"role": m.role, "content": m.content.strip()} for m in body.messages]
    ctx = body.context.strip() if body.context else None
    loc = (body.locale or "").strip() or None
    try:
        text = await run_coach_chat(db, coach, msgs, optional_context=ctx, locale=loc)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except RuntimeError as e:
        if "not configured" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(e),
            ) from e
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        ) from e
    return CoachChatResponse(message=text)
