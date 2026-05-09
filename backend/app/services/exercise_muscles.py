from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from app.models.exercise import Exercise
from app.models.exercise_muscle_group import ExerciseMuscleGroup
from app.models.muscle_group import MuscleGroup

EXERCISE_MUSCLE_LOADER = (
    selectinload(Exercise.muscle_links).selectinload(ExerciseMuscleGroup.muscle_group)
)
EXERCISE_DETAIL_LOADERS = (
    EXERCISE_MUSCLE_LOADER,
    selectinload(Exercise.video_links),
)


async def replace_exercise_muscle_groups(db, exercise_id: int, ids: list[int]) -> None:
    await db.execute(delete(ExerciseMuscleGroup).where(ExerciseMuscleGroup.exercise_id == exercise_id))
    if not ids:
        await db.flush()
        return
    r = await db.execute(
        select(MuscleGroup.id).where(MuscleGroup.id.in_(ids), MuscleGroup.is_active.is_(True))
    )
    found = {row[0] for row in r.all()}
    if set(ids) != found:
        raise HTTPException(status_code=400, detail="One or more muscle_group_ids are invalid")
    for i, mid in enumerate(ids):
        db.add(
            ExerciseMuscleGroup(
                exercise_id=exercise_id,
                muscle_group_id=mid,
                sort_order=i,
            )
        )
    await db.flush()


async def copy_exercise_muscle_groups(db, src_exercise_id: int, dest_exercise_id: int) -> None:
    r = await db.execute(
        select(ExerciseMuscleGroup)
        .where(ExerciseMuscleGroup.exercise_id == src_exercise_id)
        .order_by(ExerciseMuscleGroup.sort_order)
    )
    rows = list(r.scalars().all())
    for i, row in enumerate(rows):
        db.add(
            ExerciseMuscleGroup(
                exercise_id=dest_exercise_id,
                muscle_group_id=row.muscle_group_id,
                sort_order=i,
            )
        )
    await db.flush()
