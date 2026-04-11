from datetime import datetime
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_firebase_token
from app.models.coach import Coach
from app.models.coach_api_key import CoachApiKey
from app.services.coach_api_keys import hash_raw_key


async def _get_dev_coach(db: AsyncSession) -> Coach:
    result = await db.execute(select(Coach).where(Coach.firebase_uid == settings.dev_firebase_uid))
    coach = result.scalar_one_or_none()
    if not coach:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Coach profile not found. Call POST /auth/bootstrap first.",
        )
    return coach


def _auth_headers_missing(x_api_key: str | None, authorization: str | None) -> bool:
    if x_api_key and x_api_key.strip():
        return False
    if not authorization or not authorization.strip():
        return True
    if not authorization.startswith("Bearer "):
        return True
    return not authorization[7:].strip()


def _is_dev_mcp_alias_key(raw: str | None) -> bool:
    if not settings.dev_bypass_auth or not raw or not raw.strip():
        return False
    aliases = {a.strip() for a in settings.dev_mcp_api_key_aliases.split(",") if a.strip()}
    return raw.strip() in aliases


async def _coach_from_api_key_raw(db: AsyncSession, raw: str) -> Coach:
    raw = (raw or "").strip()
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty API key",
        )
    h = hash_raw_key(raw)
    result = await db.execute(select(CoachApiKey).where(CoachApiKey.key_hash == h))
    key_row = result.scalar_one_or_none()
    if not key_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
    await db.execute(
        update(CoachApiKey)
        .where(CoachApiKey.id == key_row.id)
        .values(last_used_at=datetime.utcnow(), updated_at=datetime.utcnow())
    )
    cres = await db.execute(select(Coach).where(Coach.id == key_row.coach_id))
    coach = cres.scalar_one_or_none()
    if not coach:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Coach profile not found for API key",
        )
    return coach


async def get_current_coach(
    authorization: Annotated[str | None, Header()] = None,
    x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
    db: AsyncSession = Depends(get_db),
) -> Coach:
    if settings.dev_bypass_auth:
        if _is_dev_mcp_alias_key(x_api_key):
            return await _get_dev_coach(db)
        if _auth_headers_missing(x_api_key, authorization):
            return await _get_dev_coach(db)

    if x_api_key and x_api_key.strip():
        return await _coach_from_api_key_raw(db, x_api_key)

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header or X-API-Key",
        )
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Empty token")

    if token.startswith("gck_"):
        return await _coach_from_api_key_raw(db, token)

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
