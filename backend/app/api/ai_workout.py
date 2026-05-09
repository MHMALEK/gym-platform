from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentCoach, DbSession
from app.schemas.ai_workout import TrainingPlanDraftRequest, TrainingPlanDraftResponse
from app.services.ai_workout_draft import generate_training_plan_draft

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/training-plan-draft", response_model=TrainingPlanDraftResponse)
async def post_training_plan_draft(
    body: TrainingPlanDraftRequest,
    coach: CurrentCoach,
    db: DbSession,
):
    try:
        return await generate_training_plan_draft(db, coach, body)
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
