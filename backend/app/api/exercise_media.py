from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentCoach, DbSession
from app.api.media import serialize_media_asset
from app.core.config import settings
from app.models.exercise import Exercise
from app.models.media_asset import ExerciseMedia, MediaAsset
from app.schemas.media import (
    ExerciseMediaItemRead,
    ExerciseMediaLinkCreate,
    ExerciseMediaLinkPatch,
    ExerciseMediaOrderUpdate,
)
from app.services.media_orphans import delete_asset_if_unreferenced

router = APIRouter(prefix="/exercises", tags=["exercise-media"])


async def _get_owned_exercise(exercise_id: int, coach: CurrentCoach, db: DbSession) -> Exercise:
    result = await db.execute(
        select(Exercise).where(Exercise.id == exercise_id, Exercise.coach_id == coach.id)
    )
    ex = result.scalar_one_or_none()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return ex


async def _clear_exclusive_role(db: DbSession, exercise_id: int, role: str) -> None:
    if role not in ("thumbnail", "primary_video"):
        return
    result = await db.execute(select(ExerciseMedia).where(ExerciseMedia.exercise_id == exercise_id, ExerciseMedia.role == role))
    for link in result.scalars().all():
        link.role = "gallery"


@router.get("/{exercise_id}/media", response_model=list[ExerciseMediaItemRead])
async def list_exercise_media(exercise_id: int, coach: CurrentCoach, db: DbSession):
    await _get_owned_exercise(exercise_id, coach, db)
    result = await db.execute(
        select(ExerciseMedia)
        .where(ExerciseMedia.exercise_id == exercise_id)
        .options(selectinload(ExerciseMedia.media_asset))
        .order_by(ExerciseMedia.sort_order, ExerciseMedia.id)
    )
    items = []
    for row in result.scalars().all():
        items.append(
            ExerciseMediaItemRead(
                id=row.id,
                exercise_id=row.exercise_id,
                media_asset_id=row.media_asset_id,
                sort_order=row.sort_order,
                role=row.role,
                asset=serialize_media_asset(row.media_asset),
            )
        )
    return items


@router.post("/{exercise_id}/media", response_model=ExerciseMediaItemRead, status_code=201)
async def link_media_to_exercise(
    exercise_id: int,
    body: ExerciseMediaLinkCreate,
    coach: CurrentCoach,
    db: DbSession,
):
    await _get_owned_exercise(exercise_id, coach, db)

    cnt = await db.scalar(
        select(func.count()).select_from(ExerciseMedia).where(ExerciseMedia.exercise_id == exercise_id)
    )
    if cnt is not None and cnt >= settings.media_max_assets_per_exercise:
        raise HTTPException(status_code=400, detail="Too many media items for this exercise")

    ares = await db.execute(
        select(MediaAsset).where(MediaAsset.id == body.media_asset_id, MediaAsset.coach_id == coach.id)
    )
    asset = ares.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Media asset not found")

    existing = await db.execute(
        select(ExerciseMedia).where(
            ExerciseMedia.exercise_id == exercise_id,
            ExerciseMedia.media_asset_id == body.media_asset_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Media already linked to this exercise")

    if body.role in ("thumbnail", "primary_video"):
        await _clear_exclusive_role(db, exercise_id, body.role)

    if body.sort_order is not None:
        sort_order = body.sort_order
    else:
        max_so = await db.scalar(
            select(func.max(ExerciseMedia.sort_order)).where(ExerciseMedia.exercise_id == exercise_id)
        )
        sort_order = (max_so or 0) + 1

    link = ExerciseMedia(
        exercise_id=exercise_id,
        media_asset_id=body.media_asset_id,
        sort_order=sort_order,
        role=body.role,
    )
    db.add(link)
    await db.flush()
    await db.commit()
    result = await db.execute(
        select(ExerciseMedia)
        .where(ExerciseMedia.id == link.id)
        .options(selectinload(ExerciseMedia.media_asset))
    )
    row = result.scalar_one()
    return ExerciseMediaItemRead(
        id=row.id,
        exercise_id=row.exercise_id,
        media_asset_id=row.media_asset_id,
        sort_order=row.sort_order,
        role=row.role,
        asset=serialize_media_asset(row.media_asset),
    )


@router.patch("/{exercise_id}/media/{link_id}", response_model=ExerciseMediaItemRead)
async def patch_exercise_media_link(
    exercise_id: int,
    link_id: int,
    body: ExerciseMediaLinkPatch,
    coach: CurrentCoach,
    db: DbSession,
):
    await _get_owned_exercise(exercise_id, coach, db)
    result = await db.execute(
        select(ExerciseMedia).where(
            ExerciseMedia.id == link_id,
            ExerciseMedia.exercise_id == exercise_id,
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Media link not found")

    if body.role in ("thumbnail", "primary_video"):
        await _clear_exclusive_role(db, exercise_id, body.role)
    link.role = body.role
    await db.commit()

    result = await db.execute(
        select(ExerciseMedia)
        .where(ExerciseMedia.id == link_id)
        .options(selectinload(ExerciseMedia.media_asset))
    )
    row = result.scalar_one()
    return ExerciseMediaItemRead(
        id=row.id,
        exercise_id=row.exercise_id,
        media_asset_id=row.media_asset_id,
        sort_order=row.sort_order,
        role=row.role,
        asset=serialize_media_asset(row.media_asset),
    )


@router.put("/{exercise_id}/media/order", response_model=list[ExerciseMediaItemRead])
async def reorder_exercise_media(
    exercise_id: int,
    body: ExerciseMediaOrderUpdate,
    coach: CurrentCoach,
    db: DbSession,
):
    await _get_owned_exercise(exercise_id, coach, db)

    result = await db.execute(
        select(ExerciseMedia).where(ExerciseMedia.exercise_id == exercise_id)
    )
    by_id = {row.id: row for row in result.scalars().all()}
    if not by_id:
        return []
    if set(body.ordered_link_ids) != set(by_id.keys()):
        raise HTTPException(status_code=400, detail="ordered_link_ids must list every media link for this exercise")

    for i, lid in enumerate(body.ordered_link_ids):
        by_id[lid].sort_order = i
    await db.commit()

    result = await db.execute(
        select(ExerciseMedia)
        .where(ExerciseMedia.exercise_id == exercise_id)
        .options(selectinload(ExerciseMedia.media_asset))
        .order_by(ExerciseMedia.sort_order, ExerciseMedia.id)
    )
    items = []
    for row in result.scalars().all():
        items.append(
            ExerciseMediaItemRead(
                id=row.id,
                exercise_id=row.exercise_id,
                media_asset_id=row.media_asset_id,
                sort_order=row.sort_order,
                role=row.role,
                asset=serialize_media_asset(row.media_asset),
            )
        )
    return items


@router.delete("/{exercise_id}/media/{link_id}", status_code=204)
async def unlink_exercise_media(exercise_id: int, link_id: int, coach: CurrentCoach, db: DbSession):
    await _get_owned_exercise(exercise_id, coach, db)
    result = await db.execute(
        select(ExerciseMedia).where(
            ExerciseMedia.id == link_id,
            ExerciseMedia.exercise_id == exercise_id,
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Media link not found")
    asset_id = link.media_asset_id
    await db.delete(link)
    await db.flush()
    await delete_asset_if_unreferenced(db, asset_id)
    await db.commit()
