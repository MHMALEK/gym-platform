import secrets
import string

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.coach import Coach

_ALPHABET = string.ascii_lowercase + string.digits


def generate_invite_code(length: int = 8) -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))


async def ensure_coach_invite_code(db: AsyncSession, coach: Coach) -> str:
    if coach.invite_code:
        return coach.invite_code
    for _ in range(12):
        code = generate_invite_code()
        existing = await db.execute(select(Coach.id).where(Coach.invite_code == code))
        if existing.scalar_one_or_none() is None:
            coach.invite_code = code
            await db.flush()
            return code
    raise RuntimeError("Could not allocate a unique invite code")
