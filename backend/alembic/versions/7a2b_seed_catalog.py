"""seed platform exercise and training plan catalog

Revision ID: 7a2b_seed_catalog
Revises: 6be0dfc7db14
Create Date: 2026-04-10

"""

from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "7a2b_seed_catalog"
down_revision: Union[str, None] = "6be0dfc7db14"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    now = datetime.utcnow().isoformat(sep=" ", timespec="seconds")
    conn = op.get_bind()

    exercises = [
        ("Squat", "Barbell back squat", "strength", "legs", "barbell"),
        ("Deadlift", "Conventional deadlift", "strength", "posterior_chain", "barbell"),
        ("Bench press", "Flat barbell bench", "strength", "chest", "barbell"),
        ("Plank", "Front plank hold", "core", "core", "bodyweight"),
        ("Push-up", "Standard push-up", "strength", "chest", "bodyweight"),
    ]
    ex_ids: list[int] = []
    for name, desc, cat, mg, eq in exercises:
        r = conn.execute(
            sa.text(
                """
                INSERT INTO exercises (coach_id, name, description, category, muscle_groups, equipment, created_at, updated_at)
                VALUES (NULL, :name, :desc, :cat, :mg, :eq, :ts, :ts)
                """
            ),
            {"name": name, "desc": desc, "cat": cat, "mg": mg, "eq": eq, "ts": now},
        )
        ex_ids.append(int(r.lastrowid))

    r = conn.execute(
        sa.text(
            """
            INSERT INTO training_plans (coach_id, name, description, source_catalog_plan_id, created_at, updated_at)
            VALUES (NULL, 'Starter full body', 'Simple 3-day introduction', NULL, :ts, :ts)
            """
        ),
        {"ts": now},
    )
    plan_id = int(r.lastrowid)

    rows = [
        {"so": 0, "eid": ex_ids[0], "sets": 3, "reps": 8, "dur": None, "rest": 90, "notes": None},
        {"so": 1, "eid": ex_ids[3], "sets": None, "reps": None, "dur": 45, "rest": None, "notes": "Hold"},
        {"so": 2, "eid": ex_ids[4], "sets": 3, "reps": 12, "dur": None, "rest": 60, "notes": None},
    ]
    for row in rows:
        conn.execute(
            sa.text(
                """
                INSERT INTO training_plan_items
                (training_plan_id, exercise_id, sort_order, sets, reps, duration_sec, rest_sec, notes, created_at, updated_at)
                VALUES (:pid, :eid, :so, :sets, :reps, :dur, :rest, :notes, :ts, :ts)
                """
            ),
            {**row, "pid": plan_id, "ts": now},
        )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "DELETE FROM training_plan_items WHERE training_plan_id IN (SELECT id FROM training_plans WHERE coach_id IS NULL)"
        )
    )
    conn.execute(sa.text("DELETE FROM training_plans WHERE coach_id IS NULL"))
    conn.execute(sa.text("DELETE FROM exercises WHERE coach_id IS NULL"))
