"""Client workout session logging."""

from __future__ import annotations

import json
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.client_workout_session import ClientWorkoutSession
from app.schemas.client import ClientWorkoutItemRead
from app.schemas.client_training import (
    ClientWorkoutSessionCreate,
    ClientWorkoutSessionRead,
    ClientWorkoutSessionUpdate,
    WorkoutEntryLog,
    WorkoutSetLog,
)


def _parse_entries(raw: str | None) -> list[WorkoutEntryLog]:
    if not raw or not raw.strip():
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    out: list[WorkoutEntryLog] = []
    for row in data:
        if isinstance(row, dict):
            try:
                out.append(WorkoutEntryLog.model_validate(row))
            except Exception:
                continue
    return out


def _dump_entries(entries: list[WorkoutEntryLog]) -> str:
    return json.dumps([e.model_dump() for e in entries], default=str)


def _session_read(row: ClientWorkoutSession) -> ClientWorkoutSessionRead:
    entries = _parse_entries(row.entries_json)
    completed = sum(1 for e in entries if e.completed)
    return ClientWorkoutSessionRead(
        id=row.id,
        started_at=row.started_at,
        completed_at=row.completed_at,
        notes=row.notes,
        entries=entries,
        exercise_count=len(entries),
        completed_exercise_count=completed,
        created_at=row.created_at,
    )


def entries_from_plan_items(items: list[ClientWorkoutItemRead]) -> list[WorkoutEntryLog]:
    out: list[WorkoutEntryLog] = []
    for idx, item in enumerate(items):
        name = item.exercise_name or f"Exercise #{item.exercise_id}"
        prescribed_sets = item.sets
        prescribed_reps = item.reps
        sets: list[WorkoutSetLog] = []
        n = prescribed_sets if prescribed_sets and prescribed_sets > 0 else 1
        for s in range(1, n + 1):
            sets.append(
                WorkoutSetLog(
                    set_number=s,
                    reps=prescribed_reps,
                    weight_kg=item.weight_kg,
                    completed=False,
                )
            )
        out.append(
            WorkoutEntryLog(
                exercise_id=item.exercise_id,
                exercise_name=name,
                sort_order=item.sort_order if item.sort_order is not None else idx,
                prescribed_sets=prescribed_sets,
                prescribed_reps=prescribed_reps,
                sets=sets,
                completed=False,
                notes=item.notes,
            )
        )
    return out


async def list_client_sessions(
    db: AsyncSession,
    client_id: int,
    *,
    limit: int = 30,
    offset: int = 0,
) -> tuple[list[ClientWorkoutSessionRead], int]:
    cond = [ClientWorkoutSession.client_id == client_id]
    total = (await db.execute(select(func.count()).select_from(ClientWorkoutSession).where(*cond))).scalar_one()
    result = await db.execute(
        select(ClientWorkoutSession)
        .where(*cond)
        .order_by(ClientWorkoutSession.started_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = result.scalars().all()
    return [_session_read(r) for r in rows], total


async def get_client_session(db: AsyncSession, client_id: int, session_id: int) -> ClientWorkoutSession | None:
    result = await db.execute(
        select(ClientWorkoutSession).where(
            ClientWorkoutSession.id == session_id,
            ClientWorkoutSession.client_id == client_id,
        )
    )
    return result.scalar_one_or_none()


async def read_client_session(
    db: AsyncSession, client_id: int, session_id: int
) -> ClientWorkoutSessionRead | None:
    row = await get_client_session(db, client_id, session_id)
    if not row:
        return None
    return _session_read(row)


async def create_client_session(
    db: AsyncSession,
    client: Client,
    body: ClientWorkoutSessionCreate,
) -> ClientWorkoutSessionRead:
    now = datetime.utcnow()
    started = body.started_at or now
    if started.tzinfo is not None:
        started = started.replace(tzinfo=None)
    completed_at = now if body.complete else None
    row = ClientWorkoutSession(
        client_id=client.id,
        started_at=started,
        completed_at=completed_at,
        notes=(body.notes or "").strip() or None,
        entries_json=_dump_entries(body.entries),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _session_read(row)


async def update_client_session(
    db: AsyncSession,
    row: ClientWorkoutSession,
    body: ClientWorkoutSessionUpdate,
) -> ClientWorkoutSessionRead:
    if body.entries is not None:
        row.entries_json = _dump_entries(body.entries)
    if body.notes is not None:
        row.notes = body.notes.strip() or None
    if body.complete is True and row.completed_at is None:
        row.completed_at = datetime.utcnow()
    elif body.complete is False:
        row.completed_at = None
    await db.commit()
    await db.refresh(row)
    return _session_read(row)
