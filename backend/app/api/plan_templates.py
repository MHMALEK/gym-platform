from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select

from app.api.deps import CurrentCoach, DbSession
from app.models.plan_template import PlanTemplate
from app.schemas.plan_template import PlanTemplateCreate, PlanTemplateRead, PlanTemplateUpdate

router = APIRouter(prefix="/plan-templates", tags=["plan-templates"])


def _normalize_code(code: str | None) -> str | None:
    if code is None:
        return None
    s = code.strip()
    return s or None


async def _code_taken(db: DbSession, coach_id: int, code: str, exclude_id: int | None = None) -> bool:
    c = _normalize_code(code)
    if c is None:
        return False
    cond = [PlanTemplate.coach_id == coach_id, PlanTemplate.code == c]
    if exclude_id is not None:
        cond.append(PlanTemplate.id != exclude_id)
    q = select(func.count()).select_from(PlanTemplate).where(*cond)
    n = (await db.execute(q)).scalar_one()
    return n > 0


@router.get("", response_model=dict)
async def list_plan_templates(
    coach: CurrentCoach,
    db: DbSession,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    cond = [PlanTemplate.coach_id == coach.id]
    total = (
        await db.execute(select(func.count()).select_from(PlanTemplate).where(*cond))
    ).scalar_one()
    stmt = (
        select(PlanTemplate)
        .where(*cond)
        .order_by(PlanTemplate.sort_order.asc(), PlanTemplate.name.asc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()
    return {
        "items": [PlanTemplateRead.model_validate(x) for x in items],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("", response_model=PlanTemplateRead, status_code=201)
async def create_plan_template(body: PlanTemplateCreate, coach: CurrentCoach, db: DbSession):
    code = _normalize_code(body.code)
    if code and await _code_taken(db, coach.id, code):
        raise HTTPException(status_code=409, detail="A plan with this code already exists")
    pt = PlanTemplate(
        coach_id=coach.id,
        name=body.name,
        description=body.description,
        duration_days=body.duration_days,
        price=body.price,
        discount_price=body.discount_price,
        currency=body.currency.strip() or "USD",
        image_url=body.image_url,
        code=code,
        sort_order=body.sort_order,
        is_active=body.is_active,
    )
    db.add(pt)
    await db.commit()
    await db.refresh(pt)
    return pt


@router.get("/{template_id}", response_model=PlanTemplateRead)
async def get_plan_template(template_id: int, coach: CurrentCoach, db: DbSession):
    result = await db.execute(
        select(PlanTemplate).where(
            PlanTemplate.id == template_id,
            PlanTemplate.coach_id == coach.id,
        )
    )
    pt = result.scalar_one_or_none()
    if not pt:
        raise HTTPException(status_code=404, detail="Plan template not found")
    return pt


@router.patch("/{template_id}", response_model=PlanTemplateRead)
async def update_plan_template(
    template_id: int,
    body: PlanTemplateUpdate,
    coach: CurrentCoach,
    db: DbSession,
):
    result = await db.execute(
        select(PlanTemplate).where(
            PlanTemplate.id == template_id,
            PlanTemplate.coach_id == coach.id,
        )
    )
    pt = result.scalar_one_or_none()
    if not pt:
        raise HTTPException(status_code=404, detail="Plan template not found")
    data = body.model_dump(exclude_unset=True)
    if "code" in data:
        data["code"] = _normalize_code(data.get("code"))
        if data["code"] and await _code_taken(db, coach.id, data["code"], exclude_id=template_id):
            raise HTTPException(status_code=409, detail="A plan with this code already exists")
    if "currency" in data and data["currency"] is not None:
        data["currency"] = data["currency"].strip() or "USD"
    for k, v in data.items():
        setattr(pt, k, v)
    await db.commit()
    await db.refresh(pt)
    return pt


@router.delete("/{template_id}", status_code=204)
async def delete_plan_template(template_id: int, coach: CurrentCoach, db: DbSession):
    result = await db.execute(
        select(PlanTemplate).where(
            PlanTemplate.id == template_id,
            PlanTemplate.coach_id == coach.id,
        )
    )
    pt = result.scalar_one_or_none()
    if not pt:
        raise HTTPException(status_code=404, detail="Plan template not found")
    await db.delete(pt)
    await db.commit()
