from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentCoach, DbSession
from app.models.exercise import Exercise
from app.models.goal_type import GoalType
from app.models.training_plan import TrainingPlan
from app.models.training_plan_item import TrainingPlanItem
from app.schemas.exercise import ExerciseRead
from app.schemas.goal_type import GoalTypeRead
from app.schemas.training_plan import TrainingPlanItemRead, TrainingPlanRead, TrainingPlanSummary

router = APIRouter(prefix="/directory", tags=["directory"])


@router.get("/goal-types", response_model=dict)
async def list_goal_types(
    coach: CurrentCoach,
    db: DbSession,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    include_inactive: bool = Query(False),
):
    count_stmt = select(func.count()).select_from(GoalType)
    stmt = select(GoalType)
    if not include_inactive:
        count_stmt = count_stmt.where(GoalType.is_active.is_(True))
        stmt = stmt.where(GoalType.is_active.is_(True))
    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(GoalType.sort_order, GoalType.label).offset(offset).limit(limit)
    result = await db.execute(stmt)
    items = result.scalars().all()
    # from_attributes required for SQLAlchemy rows (Pydantic v2); explicit for clarity
    return {
        "items": [
            GoalTypeRead.model_validate(row, from_attributes=True).model_dump()
            for row in items
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def _exercise_filters(category: str | None, q: str | None):
    cond = [Exercise.coach_id.is_(None)]
    if category:
        cond.append(Exercise.category == category)
    if q:
        cond.append(Exercise.name.ilike(f"%{q}%"))
    return cond


@router.get("/exercises", response_model=dict)
async def list_directory_exercises(
    coach: CurrentCoach,
    db: DbSession,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    category: str | None = None,
    q: str | None = None,
):
    cond = _exercise_filters(category, q)
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


def _catalog_plan_filters(q: str | None):
    cond = [TrainingPlan.coach_id.is_(None)]
    if q:
        cond.append(TrainingPlan.name.ilike(f"%{q}%"))
    return cond


@router.get("/training-plans", response_model=dict)
async def list_catalog_training_plans(
    coach: CurrentCoach,
    db: DbSession,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    q: str | None = None,
):
    cond = _catalog_plan_filters(q)
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


@router.get("/training-plans/{plan_id}", response_model=TrainingPlanRead)
async def get_catalog_training_plan(
    plan_id: int,
    coach: CurrentCoach,
    db: DbSession,
):
    result = await db.execute(
        select(TrainingPlan)
        .options(selectinload(TrainingPlan.items).selectinload(TrainingPlanItem.exercise))
        .where(TrainingPlan.id == plan_id, TrainingPlan.coach_id.is_(None))
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Catalog plan not found")
    items_out = []
    for it in sorted(plan.items, key=lambda x: x.sort_order):
        er = ExerciseRead.model_validate(it.exercise) if it.exercise else None
        tir = TrainingPlanItemRead.model_validate(it).model_copy(update={"exercise": er})
        items_out.append(tir)
    return TrainingPlanRead(
        id=plan.id,
        coach_id=plan.coach_id,
        name=plan.name,
        description=plan.description,
        source_catalog_plan_id=plan.source_catalog_plan_id,
        items=items_out,
    )
