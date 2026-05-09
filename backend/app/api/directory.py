from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentCoach, DbSession
from app.models.exercise import Exercise
from app.models.exercise_muscle_group import ExerciseMuscleGroup
from app.services.exercise_muscles import EXERCISE_DETAIL_LOADERS
from app.models.goal_type import GoalType
from app.models.muscle_group import MuscleGroup
from app.models.nutrition_template import NutritionTemplate
from app.models.training_plan import TrainingPlan
from app.models.training_plan_item import TrainingPlanItem
from app.schemas.exercise import exercise_to_read
from app.schemas.muscle_group import MuscleGroupRead
from app.schemas.goal_type import GoalTypeRead
from app.schemas.nutrition_template import NutritionTemplateRead, NutritionTemplateSummary
from app.schemas.training_plan import TrainingPlanItemRead, TrainingPlanRead, TrainingPlanSummary
from app.services.diet_meals_json import parse_diet_meals_raw

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


@router.get("/muscle-groups", response_model=dict)
async def list_muscle_groups(
    coach: CurrentCoach,
    db: DbSession,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    include_inactive: bool = Query(False),
):
    count_stmt = select(func.count()).select_from(MuscleGroup)
    stmt = select(MuscleGroup)
    if not include_inactive:
        count_stmt = count_stmt.where(MuscleGroup.is_active.is_(True))
        stmt = stmt.where(MuscleGroup.is_active.is_(True))
    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(MuscleGroup.sort_order, MuscleGroup.label).offset(offset).limit(limit)
    result = await db.execute(stmt)
    items = result.scalars().all()
    return {
        "items": [
            MuscleGroupRead.model_validate(row, from_attributes=True).model_dump() for row in items
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def _exercise_filters(
    category: str | None,
    q: str | None,
    venue_type: str | None,
    venue_compat: str | None,
    equipment: str | None = None,
    muscle_group_id: int | None = None,
):
    cond = [Exercise.coach_id.is_(None)]
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
    if q:
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
    if venue_type:
        cond.append(Exercise.venue_type == venue_type)
    if venue_compat == "home":
        cond.append(or_(Exercise.venue_type == "home", Exercise.venue_type == "both"))
    elif venue_compat == "commercial_gym":
        cond.append(or_(Exercise.venue_type == "commercial_gym", Exercise.venue_type == "both"))
    return cond


@router.get("/exercises", response_model=dict)
async def list_directory_exercises(
    coach: CurrentCoach,
    db: DbSession,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    category: str | None = None,
    q: str | None = None,
    venue_type: str | None = None,
    venue_compat: str | None = None,
    equipment: str | None = None,
    muscle_group_id: int | None = None,
):
    cond = _exercise_filters(category, q, venue_type, venue_compat, equipment, muscle_group_id)
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
        .options(
            selectinload(TrainingPlan.items).selectinload(TrainingPlanItem.exercise).options(
                *EXERCISE_DETAIL_LOADERS
            )
        )
        .where(TrainingPlan.id == plan_id, TrainingPlan.coach_id.is_(None))
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Catalog plan not found")
    items_out = []
    for it in sorted(plan.items, key=lambda x: x.sort_order):
        items_out.append(TrainingPlanItemRead.model_validate(it))
    return TrainingPlanRead(
        id=plan.id,
        coach_id=plan.coach_id,
        name=plan.name,
        description=plan.description,
        source_catalog_plan_id=plan.source_catalog_plan_id,
        items=items_out,
    )


def _catalog_nutrition_filters(q: str | None):
    cond = [NutritionTemplate.coach_id.is_(None)]
    if q:
        cond.append(NutritionTemplate.name.ilike(f"%{q}%"))
    return cond


@router.get("/nutrition-templates", response_model=dict)
async def list_catalog_nutrition_templates(
    coach: CurrentCoach,
    db: DbSession,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    q: str | None = None,
):
    cond = _catalog_nutrition_filters(q)
    total = (
        await db.execute(select(func.count()).select_from(NutritionTemplate).where(*cond))
    ).scalar_one()
    stmt = (
        select(NutritionTemplate)
        .where(*cond)
        .order_by(NutritionTemplate.name)
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()
    summaries = [
        NutritionTemplateSummary(
            id=row.id,
            coach_id=row.coach_id,
            name=row.name,
            description=row.description,
            meal_count=len(parse_diet_meals_raw(row.meals_json)),
            source_catalog_template_id=row.source_catalog_template_id,
        )
        for row in items
    ]
    return {
        "items": [s.model_dump() for s in summaries],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/nutrition-templates/{template_id}", response_model=NutritionTemplateRead)
async def get_catalog_nutrition_template(
    template_id: int,
    coach: CurrentCoach,
    db: DbSession,
):
    result = await db.execute(
        select(NutritionTemplate).where(
            NutritionTemplate.id == template_id,
            NutritionTemplate.coach_id.is_(None),
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Catalog nutrition template not found")
    return NutritionTemplateRead(
        id=row.id,
        coach_id=row.coach_id,
        name=row.name,
        description=row.description,
        notes_plan=row.notes_plan,
        meals=parse_diet_meals_raw(row.meals_json),
        source_catalog_template_id=row.source_catalog_template_id,
    )
