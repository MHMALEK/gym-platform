from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentCoach, DbSession
from app.models.training_plan import TrainingPlan
from app.models.training_plan_item import TrainingPlanItem
from app.schemas.training_plan import (
    TrainingPlanCreate,
    TrainingPlanItemRead,
    TrainingPlanItemWrite,
    TrainingPlanRead,
    TrainingPlanSummary,
    TrainingPlanUpdate,
)
from app.services.exercise_access import exercise_ids_allowed_for_coach
from app.services.exercise_muscles import EXERCISE_DETAIL_LOADERS
from app.services.workout_blocks import block_sequences_for_ordered_items, strip_orphan_workout_blocks
from app.services.workout_item_tree import validate_training_plan_items_sequence

router = APIRouter(prefix="/training-plans", tags=["training-plans"])


async def _get_owned_plan(db, coach_id: int, plan_id: int) -> TrainingPlan | None:
    result = await db.execute(
        select(TrainingPlan)
        .options(
            selectinload(TrainingPlan.items)
            .selectinload(TrainingPlanItem.exercise)
            .options(*EXERCISE_DETAIL_LOADERS)
        )
        .where(TrainingPlan.id == plan_id, TrainingPlan.coach_id == coach_id)
    )
    return result.scalar_one_or_none()


def _plan_to_read(plan: TrainingPlan) -> TrainingPlanRead:
    items_out = []
    for it in sorted(plan.items, key=lambda x: x.sort_order):
        tir = TrainingPlanItemRead.model_validate(it)
        items_out.append(tir)
    return TrainingPlanRead(
        id=plan.id,
        coach_id=plan.coach_id,
        name=plan.name,
        description=plan.description,
        workout_rich_html=plan.workout_rich_html,
        source_catalog_plan_id=plan.source_catalog_plan_id,
        venue_type=plan.venue_type,
        items=items_out,
    )


@router.get("", response_model=dict)
async def list_my_training_plans(
    coach: CurrentCoach,
    db: DbSession,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    venue_type: str | None = None,
):
    cond = [TrainingPlan.coach_id == coach.id]
    if venue_type:
        cond.append(TrainingPlan.venue_type == venue_type)
    total = (
        await db.execute(select(func.count()).select_from(TrainingPlan).where(*cond))
    ).scalar_one()
    stmt = (
        select(TrainingPlan).where(*cond).order_by(TrainingPlan.name).offset(offset).limit(limit)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()
    return {
        "items": [TrainingPlanSummary.model_validate(x) for x in items],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("", response_model=TrainingPlanSummary, status_code=201)
async def create_training_plan(body: TrainingPlanCreate, coach: CurrentCoach, db: DbSession):
    plan = TrainingPlan(
        coach_id=coach.id,
        name=body.name,
        description=body.description,
        venue_type=body.venue_type,
        workout_rich_html=body.workout_rich_html,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.post("/from-catalog/{catalog_id}", response_model=TrainingPlanRead, status_code=201)
async def copy_from_catalog(catalog_id: int, coach: CurrentCoach, db: DbSession):
    result = await db.execute(
        select(TrainingPlan)
        .options(selectinload(TrainingPlan.items))
        .where(TrainingPlan.id == catalog_id, TrainingPlan.coach_id.is_(None))
    )
    src = result.scalar_one_or_none()
    if not src:
        raise HTTPException(status_code=404, detail="Catalog plan not found")
    new_plan = TrainingPlan(
        coach_id=coach.id,
        name=src.name,
        description=src.description,
        workout_rich_html=src.workout_rich_html,
        source_catalog_plan_id=catalog_id,
        venue_type=src.venue_type,
    )
    db.add(new_plan)
    await db.flush()
    src_sorted = sorted(src.items, key=lambda x: x.sort_order)
    seqs = block_sequences_for_ordered_items(src_sorted)
    for it, bseq in zip(src_sorted, seqs):
        db.add(
            TrainingPlanItem(
                training_plan_id=new_plan.id,
                exercise_id=it.exercise_id,
                sort_order=it.sort_order,
                sets=it.sets,
                reps=it.reps,
                duration_sec=it.duration_sec,
                rest_sec=it.rest_sec,
                weight_kg=it.weight_kg,
                rpe=it.rpe,
                tempo=it.tempo,
                notes=it.notes,
                block_id=it.block_id,
                block_type=it.block_type,
                block_sequence=bseq,
                row_type=it.row_type,
                exercise_instance_id=it.exercise_instance_id,
            )
        )
    await db.commit()
    loaded = await _get_owned_plan(db, coach.id, new_plan.id)
    return _plan_to_read(loaded)


@router.get("/{plan_id}", response_model=TrainingPlanRead)
async def get_training_plan(plan_id: int, coach: CurrentCoach, db: DbSession):
    plan = await _get_owned_plan(db, coach.id, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Training plan not found")
    return _plan_to_read(plan)


@router.patch("/{plan_id}", response_model=TrainingPlanSummary)
async def update_training_plan(
    plan_id: int,
    body: TrainingPlanUpdate,
    coach: CurrentCoach,
    db: DbSession,
):
    result = await db.execute(
        select(TrainingPlan).where(TrainingPlan.id == plan_id, TrainingPlan.coach_id == coach.id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Training plan not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(plan, k, v)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.put("/{plan_id}/items", response_model=TrainingPlanRead)
async def replace_training_plan_items(
    plan_id: int,
    body: list[TrainingPlanItemWrite],
    coach: CurrentCoach,
    db: DbSession,
):
    result = await db.execute(
        select(TrainingPlan).where(TrainingPlan.id == plan_id, TrainingPlan.coach_id == coach.id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Training plan not found")
    body = strip_orphan_workout_blocks(body)
    try:
        validate_training_plan_items_sequence(body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    ids = [x.exercise_id for x in body]
    ok, err = await exercise_ids_allowed_for_coach(db, coach.id, ids)
    if not ok:
        raise HTTPException(status_code=400, detail=err)
    await db.execute(delete(TrainingPlanItem).where(TrainingPlanItem.training_plan_id == plan_id))
    body_sorted = sorted(body, key=lambda x: x.sort_order)
    seqs = block_sequences_for_ordered_items(body_sorted)
    for row, bseq in zip(body_sorted, seqs):
        db.add(
            TrainingPlanItem(
                training_plan_id=plan_id,
                exercise_id=row.exercise_id,
                sort_order=row.sort_order,
                sets=row.sets,
                reps=row.reps,
                duration_sec=row.duration_sec,
                rest_sec=row.rest_sec,
                weight_kg=row.weight_kg,
                rpe=row.rpe,
                tempo=row.tempo,
                notes=row.notes,
                block_id=row.block_id,
                block_type=row.block_type,
                block_sequence=bseq,
                row_type=row.row_type,
                exercise_instance_id=row.exercise_instance_id,
            )
        )
    await db.commit()
    loaded = await _get_owned_plan(db, coach.id, plan_id)
    return _plan_to_read(loaded)


@router.delete("/{plan_id}", status_code=204)
async def delete_training_plan(plan_id: int, coach: CurrentCoach, db: DbSession):
    owned = await db.scalar(
        select(TrainingPlan.id).where(TrainingPlan.id == plan_id, TrainingPlan.coach_id == coach.id)
    )
    if owned is None:
        raise HTTPException(status_code=404, detail="Training plan not found")
    # Use a Core DELETE so we never lazy-load `items` in the async session (ORM delete + cascade
    # would trigger MissingGreenlet). DB FK on training_plan_items uses ON DELETE CASCADE.
    await db.execute(delete(TrainingPlan).where(TrainingPlan.id == plan_id, TrainingPlan.coach_id == coach.id))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This training plan cannot be deleted because it is still referenced elsewhere.",
        ) from None
