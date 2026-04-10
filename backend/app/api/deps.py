from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_firebase_token
from app.models.coach import Coach


async def get_current_coach(
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> Coach:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Empty token")
    try:
        claims = verify_firebase_token(token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)) from e

    uid = claims["uid"]
    result = await db.execute(select(Coach).where(Coach.firebase_uid == uid))
    coach = result.scalar_one_or_none()
    if not coach:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Coach profile not found. Call POST /auth/bootstrap first.",
        )
    return coach


CurrentCoach = Annotated[Coach, Depends(get_current_coach)]
DbSession = Annotated[AsyncSession, Depends(get_db)]
