import json
from datetime import date, datetime, timedelta

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentCoach, DbSession
from app.services.workout_blocks import strip_orphan_workout_blocks
from app.models.client import Client
from app.models.client_coaching_plan import ClientCoachingPlan
from app.models.exercise import Exercise
from app.models.client_subscription import ClientSubscription
from app.models.goal_type import GoalType
from app.models.invoice import Invoice
from app.models.plan_template import PlanTemplate
from app.schemas.client import (
    ClientCoachingPlanRead,
    ClientCoachingPlanUpsert,
    ClientCreate,
    ClientRead,
    ClientUpdate,
    ClientWorkoutItemRead,
    ClientWorkoutItemWrite,
    LastInvoiceListSummary,
    MembershipListSummary,
    SubscriptionPlanSummary,
)
from app.services.exercise_access import exercise_ids_allowed_for_coach

from app.schemas.goal_type import GoalTypeSummary
from app.schemas.plan_template import PlanTemplateRead
from app.schemas.subscription import (
    ClientSubscriptionCreate,
    ClientSubscriptionRead,
    ClientSubscriptionUpdate,
)

router = APIRouter(prefix="/clients", tags=["clients"])


def _parse_coaching_workout_items_raw(raw: str | None) -> list[dict]:
    if not raw or not str(raw).strip():
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    return [x for x in data if isinstance(x, dict)]


async def _enrich_client_workout_items(
    db: DbSession,
    raw: str | None,
) -> list[ClientWorkoutItemRead]:
    rows = _parse_coaching_workout_items_raw(raw)
    validated: list[ClientWorkoutItemWrite] = []
    for row in rows:
        try:
            validated.append(ClientWorkoutItemWrite.model_validate(row))
        except Exception:
            continue
    ids = list({x.exercise_id for x in validated})
    names: dict[int, str] = {}
    if ids:
        result = await db.execute(select(Exercise).where(Exercise.id.in_(ids)))
        for ex in result.scalars().all():
            names[ex.id] = ex.name
    return [
        ClientWorkoutItemRead(**x.model_dump(), exercise_name=names.get(x.exercise_id))
        for x in validated
    ]


def _client_selectinload_options():
    return (
        selectinload(Client.subscriptions).selectinload(ClientSubscription.plan_template),
        selectinload(Client.subscription_plan_template),
        selectinload(Client.goal_type_catalog),
    )


async def _fetch_last_invoice_by_client_ids(db: DbSession, client_ids: list[int]) -> dict[int, Invoice]:
    """Newest invoice per client (by created_at)."""
    if not client_ids:
        return {}
    result = await db.execute(
        select(Invoice)
        .where(Invoice.client_id.in_(client_ids))
        .order_by(Invoice.created_at.desc())
    )
    out: dict[int, Invoice] = {}
    for inv in result.scalars().all():
        if inv.client_id not in out:
            out[inv.client_id] = inv
    return out


def _membership_list_summary(c: Client) -> MembershipListSummary | None:
    today = date.today()
    # Do not use inspect.unloaded for subscriptions: with async sessions it can still
    # mark the collection as "unloaded" after selectinload, yielding subs=[] and hiding
    # active memberships on GET /clients.
    subs = list(c.subscriptions or [])
    active = [
        s
        for s in subs
        if s.status == "active"
        and getattr(s, "plan_template", None) is not None
    ]
    if active:
        s = max(active, key=lambda x: x.starts_at)
        pt = s.plan_template
        assert pt is not None
        ends = s.ends_at
        days_rem: int | None = None
        if ends is not None:
            days_rem = (ends.date() - today).days
        return MembershipListSummary(
            plan_name=pt.name,
            plan_code=pt.code,
            ends_at=ends,
            days_remaining=days_rem,
            source="active_subscription",
        )
    if c.subscription_plan_template is not None:
        pt = c.subscription_plan_template
        ends_at: datetime | None = None
        days_rem: int | None = None
        tid = c.subscription_plan_template_id
        if tid is not None:
            dated_for_plan = [
                s
                for s in subs
                if getattr(s, "plan_template", None) is not None
                and s.plan_template_id == tid
                and s.ends_at is not None
            ]
            if dated_for_plan:
                s_pick = max(dated_for_plan, key=lambda x: x.starts_at)
                ends_at = s_pick.ends_at
                assert ends_at is not None
                days_rem = (ends_at.date() - today).days
        return MembershipListSummary(
            plan_name=pt.name,
            plan_code=pt.code,
            ends_at=ends_at,
            days_remaining=days_rem,
            source="designated_only",
        )
    return None


def _last_invoice_summary(inv: Invoice | None) -> LastInvoiceListSummary | None:
    if inv is None:
        return None
    return LastInvoiceListSummary(
        id=inv.id,
        status=inv.status,
        is_paid=inv.status == "paid",
        due_date=inv.due_date,
        amount=inv.amount,
        currency=inv.currency,
        reference=inv.reference,
    )


def _resolved_subscription_type(c: Client) -> str | None:
    active = [
        s
        for s in (c.subscriptions or [])
        if s.status == "active" and getattr(s, "plan_template", None) is not None
    ]
    if active:
        return max(active, key=lambda x: x.starts_at).plan_template.name
    pt = c.subscription_plan_template
    if pt is not None:
        return pt.name
    return None


def _client_read(c: Client, *, last_invoice: Invoice | None = None) -> ClientRead:
    st = _resolved_subscription_type(c)
    pt_summary = None
    if c.subscription_plan_template is not None:
        pt = c.subscription_plan_template
        pt_summary = SubscriptionPlanSummary(
            id=pt.id,
            name=pt.name,
            code=pt.code,
            duration_days=pt.duration_days,
            price=pt.price,
            discount_price=pt.discount_price,
            currency=pt.currency,
            image_url=pt.image_url,
        )
    gt_summary = None
    if c.goal_type_catalog is not None:
        g = c.goal_type_catalog
        gt_summary = GoalTypeSummary(id=g.id, code=g.code, label=g.label)
    return ClientRead(
        id=c.id,
        coach_id=c.coach_id,
        name=c.name,
        email=c.email,
        phone=c.phone,
        notes=c.notes,
        status=c.status,
        weight_kg=c.weight_kg,
        height_cm=c.height_cm,
        goal_type_id=c.goal_type_id,
        goal_type=gt_summary,
        goal=c.goal,
        subscription_plan_template_id=c.subscription_plan_template_id,
        subscription_plan_template=pt_summary,
        subscription_type=st,
        membership_summary=_membership_list_summary(c),
        last_invoice_summary=_last_invoice_summary(last_invoice),
        account_status=c.account_status,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


async def _ensure_subscription_plan_template(
    db: DbSession, coach_id: int, plan_template_id: int | None
) -> None:
    if plan_template_id is None:
        return
    r = await db.execute(
        select(PlanTemplate).where(
            PlanTemplate.id == plan_template_id,
            PlanTemplate.coach_id == coach_id,
        )
    )
    if r.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Plan template not found")


async def _ensure_goal_type(db: DbSession, goal_type_id: int | None) -> None:
    if goal_type_id is None:
        return
    r = await db.execute(
        select(GoalType).where(GoalType.id == goal_type_id, GoalType.is_active.is_(True))
    )
    if r.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Goal type not found")


@router.get("", response_model=dict)
async def list_clients(
    coach: CurrentCoach,
    db: DbSession,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: str | None = None,
    q: str | None = None,
):
    cond = [Client.coach_id == coach.id]
    if status:
        cond.append(Client.status == status)
    if q:
        like = f"%{q}%"
        cond.append(or_(Client.name.ilike(like), Client.email.ilike(like)))
    total = (await db.execute(select(func.count()).select_from(Client).where(*cond))).scalar_one()
    stmt = (
        select(Client)
        .options(*_client_selectinload_options())
        .where(*cond)
        .order_by(Client.name)
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()
    ids = [x.id for x in items]
    last_inv = await _fetch_last_invoice_by_client_ids(db, ids)
    return {
        "items": [_client_read(x, last_invoice=last_inv.get(x.id)) for x in items],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("", response_model=ClientRead, status_code=201)
async def create_client(body: ClientCreate, coach: CurrentCoach, db: DbSession):
    await _ensure_subscription_plan_template(db, coach.id, body.subscription_plan_template_id)
    await _ensure_goal_type(db, body.goal_type_id)
    c = Client(
        coach_id=coach.id,
        name=body.name,
        email=body.email,
        phone=body.phone,
        notes=body.notes,
        weight_kg=body.weight_kg,
        height_cm=body.height_cm,
        goal_type_id=body.goal_type_id,
        goal=body.goal,
        subscription_plan_template_id=body.subscription_plan_template_id,
        status=body.status or "active",
        account_status=body.account_status or "good_standing",
    )
    db.add(c)
    await db.commit()
    result = await db.execute(
        select(Client).options(*_client_selectinload_options()).where(Client.id == c.id)
    )
    row = result.scalar_one()
    last_map = await _fetch_last_invoice_by_client_ids(db, [row.id])
    return _client_read(row, last_invoice=last_map.get(row.id))


@router.get("/{client_id}", response_model=dict)
async def get_client(client_id: int, coach: CurrentCoach, db: DbSession):
    result = await db.execute(
        select(Client)
        .options(*_client_selectinload_options())
        .where(Client.id == client_id, Client.coach_id == coach.id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    active_subs = [s for s in c.subscriptions if s.status == "active"]
    last_map = await _fetch_last_invoice_by_client_ids(db, [c.id])
    return {
        "client": _client_read(c, last_invoice=last_map.get(c.id)),
        "active_subscriptions": len(active_subs),
        "subscriptions_preview": [
            ClientSubscriptionRead.model_validate(s).model_copy(
                update={"plan_template": PlanTemplateRead.model_validate(s.plan_template)}
            )
            for s in sorted(c.subscriptions, key=lambda x: x.starts_at, reverse=True)[:5]
        ],
    }


@router.patch("/{client_id}", response_model=ClientRead)
async def update_client(
    client_id: int,
    body: ClientUpdate,
    coach: CurrentCoach,
    db: DbSession,
):
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.coach_id == coach.id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    data = body.model_dump(exclude_unset=True)
    if "subscription_plan_template_id" in data:
        await _ensure_subscription_plan_template(db, coach.id, data["subscription_plan_template_id"])
    if "goal_type_id" in data:
        await _ensure_goal_type(db, data["goal_type_id"])
    for k, v in data.items():
        setattr(c, k, v)
    await db.commit()
    result = await db.execute(
        select(Client).options(*_client_selectinload_options()).where(Client.id == c.id)
    )
    c2 = result.scalar_one()
    last_map = await _fetch_last_invoice_by_client_ids(db, [c2.id])
    return _client_read(c2, last_invoice=last_map.get(c2.id))


@router.delete("/{client_id}", status_code=204)
async def delete_client(client_id: int, coach: CurrentCoach, db: DbSession):
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.coach_id == coach.id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    await db.delete(c)
    await db.commit()


async def _require_client(db: DbSession, coach_id: int, client_id: int) -> Client:
    result = await db.execute(select(Client).where(Client.id == client_id, Client.coach_id == coach_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    return c


@router.get("/{client_id}/coaching-plans", response_model=ClientCoachingPlanRead)
async def get_coaching_plans(client_id: int, coach: CurrentCoach, db: DbSession):
    await _require_client(db, coach.id, client_id)
    result = await db.execute(select(ClientCoachingPlan).where(ClientCoachingPlan.client_id == client_id))
    row = result.scalar_one_or_none()
    if not row:
        return ClientCoachingPlanRead(
            workout_plan=None,
            workout_rich_html=None,
            diet_plan=None,
            workout_items=[],
            updated_at=None,
        )
    items = await _enrich_client_workout_items(db, row.workout_items_json)
    return ClientCoachingPlanRead(
        workout_plan=row.workout_plan,
        workout_rich_html=row.workout_rich_html,
        diet_plan=row.diet_plan,
        workout_items=items,
        updated_at=row.updated_at,
    )


@router.put("/{client_id}/coaching-plans", response_model=ClientCoachingPlanRead)
async def upsert_coaching_plans(
    client_id: int,
    body: ClientCoachingPlanUpsert,
    coach: CurrentCoach,
    db: DbSession,
):
    await _require_client(db, coach.id, client_id)
    dump = body.model_dump(exclude_unset=True)
    result = await db.execute(select(ClientCoachingPlan).where(ClientCoachingPlan.client_id == client_id))
    row = result.scalar_one_or_none()
    if not row:
        row = ClientCoachingPlan(client_id=client_id)
        db.add(row)
    if "workout_plan" in dump:
        row.workout_plan = body.workout_plan
    if "workout_rich_html" in dump:
        row.workout_rich_html = body.workout_rich_html
    if "diet_plan" in dump:
        row.diet_plan = body.diet_plan
    if "workout_items" in dump:
        items = body.workout_items
        if items is not None:
            cleaned = strip_orphan_workout_blocks(items)
            ids = [x.exercise_id for x in cleaned]
            ok, err = await exercise_ids_allowed_for_coach(db, coach.id, ids)
            if not ok:
                raise HTTPException(status_code=400, detail=err)
            normalized: list[dict] = []
            for idx, it in enumerate(sorted(cleaned, key=lambda z: z.sort_order)):
                d = it.model_dump()
                d["sort_order"] = idx
                normalized.append(d)
            row.workout_items_json = json.dumps(normalized)
        else:
            row.workout_items_json = None
    await db.commit()
    await db.refresh(row)
    items_out = await _enrich_client_workout_items(db, row.workout_items_json)
    return ClientCoachingPlanRead(
        workout_plan=row.workout_plan,
        workout_rich_html=row.workout_rich_html,
        diet_plan=row.diet_plan,
        workout_items=items_out,
        updated_at=row.updated_at,
    )


# --- subscriptions ---


@router.post("/{client_id}/subscriptions", response_model=ClientSubscriptionRead, status_code=201)
async def create_subscription(
    client_id: int,
    body: ClientSubscriptionCreate,
    coach: CurrentCoach,
    db: DbSession,
):
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.coach_id == coach.id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    pt_result = await db.execute(
        select(PlanTemplate).where(
            PlanTemplate.id == body.plan_template_id,
            PlanTemplate.coach_id == coach.id,
        )
    )
    pt = pt_result.scalar_one_or_none()
    if not pt:
        raise HTTPException(status_code=404, detail="Plan template not found")
    ends_at = body.ends_at
    if ends_at is None and pt.duration_days:
        ends_at = body.starts_at + timedelta(days=pt.duration_days)
    sub = ClientSubscription(
        client_id=client_id,
        plan_template_id=body.plan_template_id,
        starts_at=body.starts_at,
        ends_at=ends_at,
        status="active",
        notes=body.notes,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    await db.refresh(sub, ["plan_template"])
    return ClientSubscriptionRead.model_validate(sub).model_copy(
        update={"plan_template": PlanTemplateRead.model_validate(sub.plan_template)}
    )


@router.get("/{client_id}/subscriptions", response_model=list[ClientSubscriptionRead])
async def list_subscriptions(client_id: int, coach: CurrentCoach, db: DbSession):
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.coach_id == coach.id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    subs = await db.execute(
        select(ClientSubscription)
        .options(selectinload(ClientSubscription.plan_template))
        .where(ClientSubscription.client_id == client_id)
        .order_by(ClientSubscription.starts_at.desc())
    )
    out = []
    for s in subs.scalars().all():
        out.append(
            ClientSubscriptionRead.model_validate(s).model_copy(
                update={"plan_template": PlanTemplateRead.model_validate(s.plan_template)}
            )
        )
    return out


@router.patch("/{client_id}/subscriptions/{sub_id}", response_model=ClientSubscriptionRead)
async def update_subscription(
    client_id: int,
    sub_id: int,
    body: ClientSubscriptionUpdate,
    coach: CurrentCoach,
    db: DbSession,
):
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.coach_id == coach.id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    sub_result = await db.execute(
        select(ClientSubscription)
        .options(selectinload(ClientSubscription.plan_template))
        .where(ClientSubscription.id == sub_id, ClientSubscription.client_id == client_id)
    )
    sub = sub_result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(sub, k, v)
    await db.commit()
    await db.refresh(sub)
    await db.refresh(sub, ["plan_template"])
    return ClientSubscriptionRead.model_validate(sub).model_copy(
        update={"plan_template": PlanTemplateRead.model_validate(sub.plan_template)}
    )
