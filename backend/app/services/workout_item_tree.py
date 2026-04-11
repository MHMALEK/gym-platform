"""Validate ordered workout rows: exercise heads must be followed by ≥1 set row (new model)."""

from collections.abc import Sequence

from pydantic import BaseModel

from app.schemas.training_plan import TrainingPlanItemWrite


def validate_training_plan_items_sequence(items: Sequence[TrainingPlanItemWrite]) -> None:
    """Raise ValueError if exercise/set rows are out of order or inconsistent."""
    ordered = sorted(items, key=lambda x: x.sort_order)
    pending: tuple[int, str, str | None] | None = None  # exercise_id, instance_id, block_id
    sets_in_group = 0

    for row in ordered:
        rt = row.row_type
        if rt == "legacy_line":
            if pending is not None and sets_in_group == 0:
                raise ValueError("Each exercise head must be followed by at least one set row")
            pending = None
            sets_in_group = 0
            continue

        if rt == "exercise":
            if pending is not None and sets_in_group == 0:
                raise ValueError("Each exercise head must be followed by at least one set row")
            bid = (row.block_id or "").strip() or None
            pending = (row.exercise_id, row.exercise_instance_id or "", bid)
            sets_in_group = 0
            continue

        if rt == "set":
            if pending is None:
                raise ValueError("Set rows must immediately follow their exercise head (same sort order group)")
            eid, iid, bid = pending
            if row.exercise_instance_id != iid:
                raise ValueError("Set row exercise_instance_id does not match its exercise head")
            if row.exercise_id != eid:
                raise ValueError("Set row exercise_id does not match its exercise head")
            sb = (row.block_id or "").strip() or None
            if sb != bid:
                raise ValueError("Set row block_id must match its exercise head")
            sets_in_group += 1
            continue

        raise ValueError(f"Unknown row_type: {rt}")

    if pending is not None and sets_in_group == 0:
        raise ValueError("Each exercise head must be followed by at least one set row")


def validate_any_workout_item_writes(items: Sequence[BaseModel]) -> None:
    """Validate a list of workout-like writes (e.g. client coaching JSON)."""
    conv = [TrainingPlanItemWrite.model_validate(x.model_dump()) for x in items]
    validate_training_plan_items_sequence(conv)
