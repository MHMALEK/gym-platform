from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.api.deps import DbSession
from app.api.utils import get_firebase_claims
from app.models.coach import Coach
from app.schemas.coach import CoachBootstrapResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/bootstrap", response_model=CoachBootstrapResponse)
async def bootstrap(
    db: DbSession,
    claims: dict = Depends(get_firebase_claims),
):
    uid = claims["uid"]
    result = await db.execute(select(Coach).where(Coach.firebase_uid == uid))
    existing = result.scalar_one_or_none()
    if existing:
        return CoachBootstrapResponse(
            id=existing.id,
            email=existing.email,
            name=existing.name,
            firebase_uid=existing.firebase_uid,
            created=False,
        )
    coach = Coach(
        firebase_uid=uid,
        email=claims.get("email") or "",
        name=claims.get("name") or claims.get("email") or "Coach",
    )
    db.add(coach)
    await db.commit()
    await db.refresh(coach)
    return CoachBootstrapResponse(
        id=coach.id,
        email=coach.email,
        name=coach.name,
        firebase_uid=coach.firebase_uid,
        created=True,
    )
