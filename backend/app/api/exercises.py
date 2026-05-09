from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from app.api.deps import CurrentCoach, DbSession
from app.models.exercise import Exercise, ExerciseVideoLink
from app.models.exercise_muscle_group import ExerciseMuscleGroup
from app.models.media_asset import ExerciseMedia
from app.models.training_plan_item import TrainingPlanItem
from app.schemas.exercise import (
    ExerciseCreate,
    ExerciseRead,
    ExerciseUpdate,
    ExerciseVideoLinkCreate,
    ExerciseVideoLinkRead,
    ExerciseVideoLinkUpdate,
    encoded_list,
    exercise_to_read,
    video_link_to_read,
)
from app.services.exercise_muscles import (
    EXERCISE_DETAIL_LOADERS,
    copy_exercise_muscle_groups,
    replace_exercise_muscle_groups,
)
from app.services.media_orphans import delete_asset_if_unreferenced

router = APIRouter(prefix="/exercises", tags=["exercises"])


async def _load_exercise(db, exercise_id: int, coach_id: int) -> Exercise | None:
    result = await db.execute(
        select(Exercise)
        .options(*EXERCISE_DETAIL_LOADERS)
        .where(Exercise.id == exercise_id, Exercise.coach_id == coach_id)
    )
    return result.scalar_one_or_none()


def _apply_exercise_payload(ex: Exercise, data: dict) -> None:
    for field in ("body_parts", "secondary_muscles", "instructions"):
        if field in data:
            data[field] = encoded_list(data[field])
    for k, v in data.items():
        setattr(ex, k, v)


@router.get("", response_model=dict)
async def list_my_exercises(
    coach: CurrentCoach,
    db: DbSession,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    q: str | None = None,
    venue_type: str | None = None,
    venue_compat: str | None = None,
    category: str | None = None,
    equipment: str | None = None,
    muscle_group_id: int | None = None,
):
    cond = [Exercise.coach_id == coach.id]
    if venue_type:
        cond.append(Exercise.venue_type == venue_type)
    if category:
        cond.append(Exercise.category == category)
    if equipment:
        cond.append(Exercise.equipment.ilike(f"%{equipment.strip()}%"))
    if muscle_group_id:
        cond.append(
            Exercise.id.in_(
                select(ExerciseMuscleGroup.exercise_id).where(
                    ExerciseMuscleGroup.muscle_group_id == muscle_group_id
                )
            )
        )
    if venue_compat == "home":
        cond.append(or_(Exercise.venue_type == "home", Exercise.venue_type == "both"))
    elif venue_compat == "commercial_gym":
        cond.append(or_(Exercise.venue_type == "commercial_gym", Exercise.venue_type == "both"))
    if q and q.strip():
        term = f"%{q.strip()}%"
        cond.append(
            or_(
                Exercise.name.ilike(term),
                Exercise.description.ilike(term),
                Exercise.tips.ilike(term),
                Exercise.common_mistakes.ilike(term),
                Exercise.correct_form_cues.ilike(term),
            )
        )
    total = (
        await db.execute(select(func.count()).select_from(Exercise).where(*cond))
    ).scalar_one()
    stmt = (
        select(Exercise)
        .options(*EXERCISE_DETAIL_LOADERS)
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
        difficulty=body.difficulty,
        exercise_type=body.exercise_type,
        body_parts=encoded_list(body.body_parts),
        secondary_muscles=encoded_list(body.secondary_muscles),
        instructions=encoded_list(body.instructions),
        setup_notes=body.setup_notes,
        safety_notes=body.safety_notes,
        source_url=body.source_url,
        license_status=body.license_status,
    )
    db.add(ex)
    await db.flush()
    await replace_exercise_muscle_groups(db, ex.id, body.muscle_group_ids)
    await db.commit()
    loaded = (
        await db.execute(
            select(Exercise).where(Exercise.id == ex.id).options(*EXERCISE_DETAIL_LOADERS)
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
        .options(*EXERCISE_DETAIL_LOADERS)
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
        external_source=src.external_source,
        external_id=src.external_id,
        difficulty=src.difficulty,
        exercise_type=src.exercise_type,
        body_parts=src.body_parts,
        secondary_muscles=src.secondary_muscles,
        instructions=src.instructions,
        setup_notes=src.setup_notes,
        safety_notes=src.safety_notes,
        source_url=src.source_url,
        license_status=src.license_status,
    )
    db.add(ex)
    await db.flush()
    await copy_exercise_muscle_groups(db, src.id, ex.id)
    for index, link in enumerate(src.video_links or []):
        db.add(
            ExerciseVideoLink(
                exercise_id=ex.id,
                provider=link.provider,
                url=link.url,
                title=link.title,
                description=link.description,
                sort_order=index,
                source=link.source,
            )
        )
    await db.commit()
    loaded = (
        await db.execute(
            select(Exercise).where(Exercise.id == ex.id).options(*EXERCISE_DETAIL_LOADERS)
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
    _apply_exercise_payload(ex, data)
    if mg_ids is not None:
        await replace_exercise_muscle_groups(db, ex.id, mg_ids)
    await db.commit()
    reloaded = await _load_exercise(db, exercise_id, coach.id)
    assert reloaded is not None
    return exercise_to_read(reloaded)


@router.post("/{exercise_id}/video-links", response_model=ExerciseVideoLinkRead, status_code=201)
async def create_exercise_video_link(
    exercise_id: int,
    body: ExerciseVideoLinkCreate,
    coach: CurrentCoach,
    db: DbSession,
):
    ex = await _load_exercise(db, exercise_id, coach.id)
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    sort_order = body.sort_order
    if sort_order is None:
        current_max = await db.scalar(
            select(func.max(ExerciseVideoLink.sort_order)).where(
                ExerciseVideoLink.exercise_id == exercise_id
            )
        )
        sort_order = 0 if current_max is None else current_max + 1
    link = ExerciseVideoLink(
        exercise_id=exercise_id,
        provider=body.provider,
        url=body.url,
        title=body.title,
        description=body.description,
        sort_order=sort_order,
        source=body.source,
    )
    db.add(link)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing = await db.scalar(
            select(ExerciseVideoLink).where(
                ExerciseVideoLink.exercise_id == exercise_id,
                ExerciseVideoLink.url == body.url,
            )
        )
        if existing:
            return video_link_to_read(existing)
        raise HTTPException(status_code=409, detail="Video link already exists") from None
    await db.refresh(link)
    return video_link_to_read(link)


@router.patch("/{exercise_id}/video-links/{link_id}", response_model=ExerciseVideoLinkRead)
async def update_exercise_video_link(
    exercise_id: int,
    link_id: int,
    body: ExerciseVideoLinkUpdate,
    coach: CurrentCoach,
    db: DbSession,
):
    ex = await _load_exercise(db, exercise_id, coach.id)
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    link = await db.scalar(
        select(ExerciseVideoLink).where(
            ExerciseVideoLink.id == link_id,
            ExerciseVideoLink.exercise_id == exercise_id,
        )
    )
    if not link:
        raise HTTPException(status_code=404, detail="Video link not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(link, key, value)
    await db.commit()
    await db.refresh(link)
    return video_link_to_read(link)


@router.delete("/{exercise_id}/video-links/{link_id}", status_code=204)
async def delete_exercise_video_link(
    exercise_id: int,
    link_id: int,
    coach: CurrentCoach,
    db: DbSession,
):
    ex = await _load_exercise(db, exercise_id, coach.id)
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    await db.execute(
        delete(ExerciseVideoLink).where(
            ExerciseVideoLink.id == link_id,
            ExerciseVideoLink.exercise_id == exercise_id,
        )
    )
    await db.commit()


@router.delete("/{exercise_id}", status_code=204)
async def delete_exercise(exercise_id: int, coach: CurrentCoach, db: DbSession):
    result = await db.execute(
        select(Exercise).where(Exercise.id == exercise_id, Exercise.coach_id == coach.id)
    )
    ex = result.scalar_one_or_none()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")

    in_plans = await db.scalar(
        select(func.count()).select_from(TrainingPlanItem).where(TrainingPlanItem.exercise_id == exercise_id)
    )
    if in_plans and in_plans > 0:
        raise HTTPException(
            status_code=409,
            detail="This exercise is used in one or more training plans. Remove it from those plans first, then try again.",
        )

    r = await db.execute(
        select(ExerciseMedia.media_asset_id).where(ExerciseMedia.exercise_id == exercise_id)
    )
    asset_ids = {row[0] for row in r.all()}
    try:
        await db.delete(ex)
        await db.flush()
        for aid in asset_ids:
            await delete_asset_if_unreferenced(db, aid)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This exercise cannot be deleted because it is still referenced elsewhere.",
        ) from None
