from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentCoach, DbSession
from app.core.config import settings
from app.schemas.demo import DemoActionResponse, DemoSeedSummary
from app.services.demo_seed import reset_coach_demo_data, seed_coach_demo_data

router = APIRouter(prefix="/demo", tags=["demo"])


def _require_dev_demo() -> None:
    if not settings.dev_bypass_auth:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo endpoints are disabled. Set DEV_BYPASS_AUTH=true for local use.",
        )


@router.post("/reset", response_model=DemoActionResponse)
async def demo_reset(coach: CurrentCoach, db: DbSession):
    """Clear this coach's clients, plans, invoices, and related demo data."""
    _require_dev_demo()
    await reset_coach_demo_data(db, coach.id)
    await db.commit()
    return DemoActionResponse(action="reset")


@router.post("/seed", response_model=DemoActionResponse)
async def demo_seed(coach: CurrentCoach, db: DbSession):
    """Reset then load a full demo workspace (clients, plans, invoices, messages, training log)."""
    _require_dev_demo()
    try:
        summary = await seed_coach_demo_data(db, coach)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return DemoActionResponse(action="seed", summary=summary)
