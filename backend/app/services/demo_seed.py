"""Reset and seed coach business data for local demos."""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.client import Client
from app.models.client_coaching_plan import ClientCoachingPlan
from app.models.client_workout_session import ClientWorkoutSession
from app.models.coach import Coach
from app.models.exercise import Exercise
from app.models.invoice import Invoice
from app.models.nutrition_template import NutritionTemplate
from app.models.plan_template import PlanTemplate
from app.models.training_plan import TrainingPlan
from app.models.training_plan_item import TrainingPlanItem
from app.schemas.demo import DemoSeedSummary
from app.services.client_chat import append_client_message, append_coach_message, ensure_thread
from app.services.client_training import entries_from_plan_items
from app.services.invite_codes import ensure_coach_invite_code
from app.services.workout_blocks import block_sequences_for_ordered_items, inject_block_sequences_into_item_dicts


async def ensure_dev_coach(db: AsyncSession) -> Coach:
    result = await db.execute(select(Coach).where(Coach.firebase_uid == settings.dev_firebase_uid))
    coach = result.scalar_one_or_none()
    if coach:
        return coach
    coach = Coach(
        firebase_uid=settings.dev_firebase_uid,
        email=settings.dev_coach_email,
        name=settings.dev_coach_name,
    )
    db.add(coach)
    await db.flush()
    await ensure_coach_invite_code(db, coach)
    return coach


async def reset_coach_demo_data(db: AsyncSession, coach_id: int) -> None:
    """Remove coach-owned business rows. Catalog (coach_id NULL) is kept."""
    await db.execute(delete(Client).where(Client.coach_id == coach_id))
    await db.execute(delete(TrainingPlan).where(TrainingPlan.coach_id == coach_id))
    await db.execute(delete(NutritionTemplate).where(NutritionTemplate.coach_id == coach_id))
    await db.execute(delete(PlanTemplate).where(PlanTemplate.coach_id == coach_id))
    await db.execute(delete(Exercise).where(Exercise.coach_id == coach_id))
    await db.flush()


async def _first_catalog_training_plan(db: AsyncSession) -> TrainingPlan | None:
    result = await db.execute(
        select(TrainingPlan)
        .options(selectinload(TrainingPlan.items))
        .where(TrainingPlan.coach_id.is_(None))
        .order_by(TrainingPlan.id.asc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _first_catalog_nutrition(db: AsyncSession) -> NutritionTemplate | None:
    result = await db.execute(
        select(NutritionTemplate)
        .where(NutritionTemplate.coach_id.is_(None))
        .order_by(NutritionTemplate.id.asc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _copy_training_plan(db: AsyncSession, coach_id: int, catalog: TrainingPlan) -> TrainingPlan:
    plan = TrainingPlan(
        coach_id=coach_id,
        name=catalog.name,
        description=catalog.description,
        workout_rich_html=catalog.workout_rich_html,
        source_catalog_plan_id=catalog.id,
        venue_type=catalog.venue_type,
    )
    db.add(plan)
    await db.flush()
    src_sorted = sorted(catalog.items, key=lambda x: x.sort_order)
    seqs = block_sequences_for_ordered_items(src_sorted)
    for it, bseq in zip(src_sorted, seqs):
        db.add(
            TrainingPlanItem(
                training_plan_id=plan.id,
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
    await db.flush()
    return plan


async def _copy_nutrition_template(db: AsyncSession, coach_id: int, catalog: NutritionTemplate) -> NutritionTemplate:
    row = NutritionTemplate(
        coach_id=coach_id,
        name=catalog.name,
        description=catalog.description,
        notes_plan=catalog.notes_plan,
        meals_json=catalog.meals_json,
        source_catalog_template_id=catalog.id,
    )
    db.add(row)
    await db.flush()
    return row


def _workout_items_json_from_plan(plan: TrainingPlan) -> str:
    items: list[dict] = []
    for idx, it in enumerate(sorted(plan.items, key=lambda x: x.sort_order)):
        items.append(
            {
                "exercise_id": it.exercise_id,
                "sort_order": idx,
                "sets": it.sets,
                "reps": it.reps,
                "duration_sec": it.duration_sec,
                "rest_sec": it.rest_sec,
                "weight_kg": it.weight_kg,
                "rpe": it.rpe,
                "tempo": it.tempo,
                "notes": it.notes,
                "block_id": it.block_id,
                "block_type": it.block_type,
                "row_type": it.row_type or "legacy_line",
                "exercise_instance_id": it.exercise_instance_id,
            }
        )
    inject_block_sequences_into_item_dicts(items)
    return json.dumps(items)


async def _assign_coaching_plan(
    db: AsyncSession,
    *,
    client_id: int,
    training_plan: TrainingPlan | None,
    nutrition: NutritionTemplate | None,
) -> None:
    row = ClientCoachingPlan(client_id=client_id)
    if training_plan:
        row.assigned_training_plan_id = training_plan.id
        row.program_venue = training_plan.venue_type or "mixed"
        row.workout_plan = training_plan.description
        row.workout_items_json = _workout_items_json_from_plan(training_plan)
    if nutrition:
        row.assigned_nutrition_template_id = nutrition.id
        row.diet_plan = nutrition.notes_plan
        row.diet_meals_json = nutrition.meals_json
    db.add(row)


async def seed_coach_demo_data(db: AsyncSession, coach: Coach) -> DemoSeedSummary:
    """Replace coach business data with a ready-to-demo workspace."""
    await reset_coach_demo_data(db, coach.id)

    coach.name = settings.dev_coach_name or "Alex Coach"
    coach.tagline = coach.tagline or "Strength & nutrition coaching"
    coach.primary_color = coach.primary_color or "#f59e0b"
    invite_code = await ensure_coach_invite_code(db, coach)

    catalog_tp = await _first_catalog_training_plan(db)
    catalog_nt = await _first_catalog_nutrition(db)
    if not catalog_tp:
        raise ValueError("No catalog training plan found. Run alembic upgrade head first.")

    training_plan = await _copy_training_plan(db, coach.id, catalog_tp)
    loaded_tp = await db.execute(
        select(TrainingPlan)
        .options(selectinload(TrainingPlan.items))
        .where(TrainingPlan.id == training_plan.id)
    )
    training_plan = loaded_tp.scalar_one()
    nutrition = await _copy_nutrition_template(db, coach.id, catalog_nt) if catalog_nt else None

    membership = PlanTemplate(
        coach_id=coach.id,
        name="12-Week Online Coaching",
        description="Workout plan, nutrition template, and weekly check-ins.",
        duration_days=84,
        price=Decimal("299.00"),
        discount_price=Decimal("249.00"),
        currency="USD",
        is_active=True,
        sort_order=0,
    )
    db.add(membership)
    await db.flush()

    today = date.today()
    clients_spec = [
        {
            "name": settings.dev_client_name or "Sara Demo",
            "email": settings.dev_client_email,
            "firebase_uid": settings.dev_client_firebase_uid,
            "account_status": "good_standing",
            "assign_plans": True,
            "invoice": {"amount": Decimal("149.00"), "due": today + timedelta(days=3), "status": "pending"},
            "messages": True,
            "workout_log": True,
        },
        {
            "name": "Ali Rahimi",
            "email": "ali.demo@example.com",
            "firebase_uid": None,
            "account_status": "payment_issue",
            "assign_plans": False,
            "invoice": {"amount": Decimal("99.00"), "due": today - timedelta(days=5), "status": "overdue"},
            "messages": False,
            "workout_log": False,
        },
        {
            "name": "Neda Karimi",
            "email": "neda.demo@example.com",
            "firebase_uid": None,
            "account_status": "onboarding",
            "assign_plans": False,
            "invoice": None,
            "messages": True,
            "workout_log": False,
        },
    ]

    message_count = 0
    session_count = 0
    invoice_count = 0

    for spec in clients_spec:
        client = Client(
            coach_id=coach.id,
            name=spec["name"],
            email=spec["email"],
            firebase_uid=spec["firebase_uid"],
            status="active",
            account_status=spec["account_status"],
            subscription_plan_template_id=membership.id,
        )
        db.add(client)
        await db.flush()

        if spec["assign_plans"]:
            await _assign_coaching_plan(
                db,
                client_id=client.id,
                training_plan=training_plan,
                nutrition=nutrition,
            )

        inv_spec = spec.get("invoice")
        if inv_spec:
            db.add(
                Invoice(
                    client_id=client.id,
                    reference=f"DEMO-{client.id:03d}",
                    amount=inv_spec["amount"],
                    currency="USD",
                    due_date=inv_spec["due"],
                    status=inv_spec["status"],
                    notes="Demo invoice",
                )
            )
            invoice_count += 1

        if spec.get("messages"):
            thread = await ensure_thread(db, coach_id=coach.id, client_id=client.id)
            await append_coach_message(
                db,
                thread_id=thread.id,
                body="Welcome! Your workout and nutrition plans are ready — message me anytime.",
            )
            message_count += 1
            if spec["firebase_uid"]:
                await append_client_message(
                    db,
                    thread_id=thread.id,
                    body="Thanks coach! Starting the program this week.",
                )
                message_count += 1

        if spec.get("workout_log") and training_plan.items:
            from app.schemas.client import ClientWorkoutItemRead

            items = [
                ClientWorkoutItemRead(
                    exercise_id=it.exercise_id,
                    sort_order=it.sort_order,
                    sets=it.sets,
                    reps=it.reps,
                    duration_sec=it.duration_sec,
                    rest_sec=it.rest_sec,
                    weight_kg=it.weight_kg,
                    notes=it.notes,
                    exercise_name=None,
                )
                for it in sorted(training_plan.items, key=lambda x: x.sort_order)
            ]
            entries = entries_from_plan_items(items)
            if entries:
                entries[0].completed = True
                if entries[0].sets:
                    entries[0].sets[0].completed = True
                    entries[0].sets[0].reps = entries[0].sets[0].reps or 8
                    entries[0].sets[0].weight_kg = 60.0
            started = datetime.utcnow() - timedelta(days=1)
            db.add(
                ClientWorkoutSession(
                    client_id=client.id,
                    started_at=started,
                    completed_at=started + timedelta(minutes=52),
                    notes="Felt strong on squats.",
                    entries_json=json.dumps([e.model_dump() for e in entries]),
                )
            )
            session_count += 1

    await db.commit()
    await db.refresh(coach)

    return DemoSeedSummary(
        coach_id=coach.id,
        invite_code=invite_code,
        clients=len(clients_spec),
        training_plans=1,
        nutrition_templates=1 if nutrition else 0,
        plan_templates=1,
        invoices=invoice_count,
        messages=message_count,
        workout_sessions=session_count,
    )
