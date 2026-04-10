from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exercise import Exercise


async def exercise_ids_allowed_for_coach(
    db: AsyncSession,
    coach_id: int,
    exercise_ids: list[int],
) -> tuple[bool, str | None]:
    if not exercise_ids:
        return True, None
    unique_ids = list(dict.fromkeys(exercise_ids))
    result = await db.execute(select(Exercise).where(Exercise.id.in_(unique_ids)))
    rows = result.scalars().all()
    if len(rows) != len(unique_ids):
        return False, "Unknown exercise id"
    for ex in rows:
        if ex.coach_id is None:
            continue
        if ex.coach_id != coach_id:
            return False, f"Exercise {ex.id} is not in your library or directory"
    return True, None
