from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from app.api.deps import CurrentCoach, DbSession
from app.models.exercise import Exercise
from app.models.media_asset import ExerciseMedia
from app.schemas.exercise import ExerciseCreate, ExerciseRead, ExerciseUpdate, exercise_to_read
from app.services.exercise_muscles import (
    EXERCISE_MUSCLE_LOADER,
    copy_exercise_muscle_groups,
    replace_exercise_muscle_groups,
)
from app.services.media_orphans import delete_asset_if_unreferenced

router = APIRouter(prefix="/exercises", tags=["exercises"])


async def _load_exercise(db, exercise_id: int, coach_id: int) -> Exercise | None:
    result = await db.execute(
        select(Exercise)
        .options(EXERCISE_MUSCLE_LOADER)
        .where(Exercise.id == exercise_id, Exercise.coach_id == coach_id)
    )
    return result.scalar_one_or_none()


@router.get("", response_model=dict)
async def list_my_exercises(
    coach: CurrentCoach,
    db: DbSession,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    q: str | None = None,
    venue_type: str | None = None,
    venue_compat: str | None = None,
):
    cond = [Exercise.coach_id == coach.id]
    if venue_type:
        cond.append(Exercise.venue_type == venue_type)
    if venue_compat == "home":
        cond.append(or_(Exercise.venue_type == "home", Exercise.venue_type == "both"))
    elif venue_compat == "commercial_gym":
        cond.append(or_(Exercise.venue_type == "commercial_gym", Exercise.venue_type == "both"))
    if q and q.strip():
        term = f"%{q.strip()}%"
        cond.append(or_(Exercise.name.ilike(term), Exercise.description.ilike(term)))
    total = (
        await db.execute(select(func.count()).select_from(Exercise).where(*cond))
    ).scalar_one()
    stmt = (
        select(Exercise)
        .options(EXERCISE_MUSCLE_LOADER)
        .where(*cond)
        .order_by(Exercise.name)
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()
    return {
        "items": [exercise_to_read(x) for x in items],
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
        equipment=body.equipment,
        venue_type=body.venue_type,
        tips=body.tips,
        common_mistakes=body.common_mistakes,
        correct_form_cues=body.correct_form_cues,
        demo_media_url=body.demo_media_url,
        thumbnail_url=body.thumbnail_url,
    )
    db.add(ex)
    await db.flush()
    await replace_exercise_muscle_groups(db, ex.id, body.muscle_group_ids)
    await db.commit()
    loaded = (
        await db.execute(
            select(Exercise).where(Exercise.id == ex.id).options(EXERCISE_MUSCLE_LOADER)
        )
    ).scalar_one()
    return exercise_to_read(loaded)


@router.post("/from-directory/{directory_exercise_id}", response_model=ExerciseRead, status_code=201)
async def copy_exercise_from_directory(
    directory_exercise_id: int,
    coach: CurrentCoach,
    db: DbSession,
):
    """Copy a platform catalog exercise (coach_id null) into the current coach's library."""
    result = await db.execute(
        select(Exercise)
        .options(EXERCISE_MUSCLE_LOADER)
        .where(
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
        equipment=src.equipment,
        venue_type=src.venue_type,
        tips=src.tips,
        common_mistakes=src.common_mistakes,
        correct_form_cues=src.correct_form_cues,
        demo_media_url=src.demo_media_url,
        thumbnail_url=src.thumbnail_url,
    )
    db.add(ex)
    await db.flush()
    await copy_exercise_muscle_groups(db, src.id, ex.id)
    await db.commit()
    loaded = (
        await db.execute(
            select(Exercise).where(Exercise.id == ex.id).options(EXERCISE_MUSCLE_LOADER)
        )
    ).scalar_one()
    return exercise_to_read(loaded)


@router.get("/{exercise_id}", response_model=ExerciseRead)
async def get_exercise(exercise_id: int, coach: CurrentCoach, db: DbSession):
    ex = await _load_exercise(db, exercise_id, coach.id)
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise_to_read(ex)


@router.patch("/{exercise_id}", response_model=ExerciseRead)
async def update_exercise(
    exercise_id: int,
    body: ExerciseUpdate,
    coach: CurrentCoach,
    db: DbSession,
):
    ex = await _load_exercise(db, exercise_id, coach.id)
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    data = body.model_dump(exclude_unset=True)
    mg_ids = data.pop("muscle_group_ids", None)
    for k, v in data.items():
        setattr(ex, k, v)
    if mg_ids is not None:
        await replace_exercise_muscle_groups(db, ex.id, mg_ids)
    await db.commit()
    reloaded = await _load_exercise(db, exercise_id, coach.id)
    assert reloaded is not None
    return exercise_to_read(reloaded)


@router.delete("/{exercise_id}", status_code=204)
async def delete_exercise(exercise_id: int, coach: CurrentCoach, db: DbSession):
    result = await db.execute(
        select(Exercise).where(Exercise.id == exercise_id, Exercise.coach_id == coach.id)
    )
    ex = result.scalar_one_or_none()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    r = await db.execute(
        select(ExerciseMedia.media_asset_id).where(ExerciseMedia.exercise_id == exercise_id)
    )
    asset_ids = {row[0] for row in r.all()}
    await db.delete(ex)
    await db.flush()
    for aid in asset_ids:
        await delete_asset_if_unreferenced(db, aid)
    await db.commit()
