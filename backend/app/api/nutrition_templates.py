from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select

from app.api.deps import CurrentCoach, DbSession
from app.models.nutrition_template import NutritionTemplate
from app.schemas.client import DietMeal
from app.schemas.nutrition_template import (
    NutritionTemplateCreate,
    NutritionTemplateRead,
    NutritionTemplateSummary,
    NutritionTemplateUpdate,
)
from app.services.diet_meals_json import diet_meals_to_json_column, parse_diet_meals_raw

router = APIRouter(prefix="/nutrition-templates", tags=["nutrition-templates"])


def _to_read(row: NutritionTemplate) -> NutritionTemplateRead:
    return NutritionTemplateRead(
        id=row.id,
        coach_id=row.coach_id,
        name=row.name,
        description=row.description,
        notes_plan=row.notes_plan,
        meals=parse_diet_meals_raw(row.meals_json),
        source_catalog_template_id=row.source_catalog_template_id,
    )


def _to_summary(row: NutritionTemplate) -> NutritionTemplateSummary:
    return NutritionTemplateSummary(
        id=row.id,
        coach_id=row.coach_id,
        name=row.name,
        description=row.description,
        meal_count=len(parse_diet_meals_raw(row.meals_json)),
        source_catalog_template_id=row.source_catalog_template_id,
    )


async def _get_owned(db: DbSession, coach_id: int, template_id: int) -> NutritionTemplate | None:
    result = await db.execute(
        select(NutritionTemplate).where(
            NutritionTemplate.id == template_id,
            NutritionTemplate.coach_id == coach_id,
        )
    )
    return result.scalar_one_or_none()


@router.get("", response_model=dict)
async def list_my_nutrition_templates(
    coach: CurrentCoach,
    db: DbSession,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    q: str | None = None,
):
    cond = [NutritionTemplate.coach_id == coach.id]
    if q and q.strip():
        term = f"%{q.strip()}%"
        cond.append(NutritionTemplate.name.ilike(term))
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
    return {
        "items": [_to_summary(x) for x in items],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("", response_model=NutritionTemplateRead, status_code=201)
async def create_nutrition_template(
    body: NutritionTemplateCreate,
    coach: CurrentCoach,
    db: DbSession,
):
    row = NutritionTemplate(
        coach_id=coach.id,
        name=body.name.strip(),
        description=body.description.strip() if body.description else None,
        notes_plan=body.notes_plan.strip() if body.notes_plan else None,
        meals_json=diet_meals_to_json_column(body.meals),
        source_catalog_template_id=None,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get("/{template_id}", response_model=NutritionTemplateRead)
async def get_nutrition_template(
    template_id: int,
    coach: CurrentCoach,
    db: DbSession,
):
    row = await _get_owned(db, coach.id, template_id)
    if not row:
        raise HTTPException(status_code=404, detail="Nutrition template not found")
    return _to_read(row)


@router.patch("/{template_id}", response_model=NutritionTemplateRead)
async def update_nutrition_template(
    template_id: int,
    body: NutritionTemplateUpdate,
    coach: CurrentCoach,
    db: DbSession,
):
    row = await _get_owned(db, coach.id, template_id)
    if not row:
        raise HTTPException(status_code=404, detail="Nutrition template not found")
    data = body.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        row.name = data["name"].strip()
    if "description" in data:
        row.description = data["description"].strip() if data["description"] else None
    if "notes_plan" in data:
        row.notes_plan = data["notes_plan"].strip() if data["notes_plan"] else None
    if "meals" in data:
        meals = data["meals"]
        if meals is not None:
            validated = [DietMeal.model_validate(m) for m in meals]
            row.meals_json = diet_meals_to_json_column(validated)
        else:
            row.meals_json = None
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete("/{template_id}", status_code=204)
async def delete_nutrition_template(
    template_id: int,
    coach: CurrentCoach,
    db: DbSession,
):
    row = await _get_owned(db, coach.id, template_id)
    if not row:
        raise HTTPException(status_code=404, detail="Nutrition template not found")
    await db.delete(row)
    await db.commit()


@router.post("/from-catalog/{catalog_id}", response_model=NutritionTemplateRead, status_code=201)
async def copy_nutrition_template_from_catalog(
    catalog_id: int,
    coach: CurrentCoach,
    db: DbSession,
):
    result = await db.execute(
        select(NutritionTemplate).where(
            NutritionTemplate.id == catalog_id,
            NutritionTemplate.coach_id.is_(None),
        )
    )
    src = result.scalar_one_or_none()
    if not src:
        raise HTTPException(status_code=404, detail="Catalog nutrition template not found")
    row = NutritionTemplate(
        coach_id=coach.id,
        name=src.name,
        description=src.description,
        notes_plan=src.notes_plan,
        meals_json=src.meals_json,
        source_catalog_template_id=catalog_id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)
