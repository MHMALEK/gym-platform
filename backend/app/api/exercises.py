from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select

from app.api.deps import CurrentCoach, DbSession
from app.models.exercise import Exercise
from app.schemas.exercise import ExerciseCreate, ExerciseRead, ExerciseUpdate

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("", response_model=dict)
async def list_my_exercises(
    coach: CurrentCoach,
    db: DbSession,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    q: str | None = None,
):
    cond = [Exercise.coach_id == coach.id]
    if q and q.strip():
        term = f"%{q.strip()}%"
        cond.append(or_(Exercise.name.ilike(term), Exercise.description.ilike(term)))
    total = (
        await db.execute(select(func.count()).select_from(Exercise).where(*cond))
    ).scalar_one()
    stmt = select(Exercise).where(*cond).order_by(Exercise.name).offset(offset).limit(limit)
    result = await db.execute(stmt)
    items = result.scalars().all()
    return {
        "items": [ExerciseRead.model_validate(x) for x in items],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("", response_model=ExerciseRead, status_code=201)
async def create_exercise(body: ExerciseCreate, coach: CurrentCoach, db: DbSession):
    ex = Exercise(
        coach_id=coach.id,
        name=body.name,
        description=body.description,
        category=body.category,
        muscle_groups=body.muscle_groups,
        equipment=body.equipment,
    )
    db.add(ex)
    await db.commit()
    await db.refresh(ex)
    return ex


@router.post("/from-directory/{directory_exercise_id}", response_model=ExerciseRead, status_code=201)
async def copy_exercise_from_directory(
    directory_exercise_id: int,
    coach: CurrentCoach,
    db: DbSession,
):
    """Copy a platform catalog exercise (coach_id null) into the current coach's library."""
    result = await db.execute(
        select(Exercise).where(
            Exercise.id == directory_exercise_id,
            Exercise.coach_id.is_(None),
        )
    )
    src = result.scalar_one_or_none()
    if not src:
        raise HTTPException(status_code=404, detail="Catalog exercise not found")
    ex = Exercise(
        coach_id=coach.id,
        name=src.name,
        description=src.description,
        category=src.category,
        muscle_groups=src.muscle_groups,
        equipment=src.equipment,
    )
    db.add(ex)
    await db.commit()
    await db.refresh(ex)
    return ex


@router.get("/{exercise_id}", response_model=ExerciseRead)
async def get_exercise(exercise_id: int, coach: CurrentCoach, db: DbSession):
    result = await db.execute(
        select(Exercise).where(Exercise.id == exercise_id, Exercise.coach_id == coach.id)
    )
    ex = result.scalar_one_or_none()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return ex


@router.patch("/{exercise_id}", response_model=ExerciseRead)
async def update_exercise(
    exercise_id: int,
    body: ExerciseUpdate,
    coach: CurrentCoach,
    db: DbSession,
):
    result = await db.execute(
        select(Exercise).where(Exercise.id == exercise_id, Exercise.coach_id == coach.id)
    )
    ex = result.scalar_one_or_none()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(ex, k, v)
    await db.commit()
    await db.refresh(ex)
    return ex


@router.delete("/{exercise_id}", status_code=204)
async def delete_exercise(exercise_id: int, coach: CurrentCoach, db: DbSession):
    result = await db.execute(
        select(Exercise).where(Exercise.id == exercise_id, Exercise.coach_id == coach.id)
    )
    ex = result.scalar_one_or_none()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    await db.delete(ex)
    await db.commit()
