from collections import Counter
from collections.abc import Sequence
from typing import Any, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


def _row_block_id(row: object) -> str | None:
    if isinstance(row, dict):
        bid = row.get("block_id")
    else:
        bid = getattr(row, "block_id", None)
    if bid is None:
        return None
    s = str(bid).strip()
    return s or None


def block_sequences_for_ordered_items(items: Sequence[object]) -> list[int | None]:
    """0-based position within each block_id group; None when not in a block (same order as input)."""
    out: list[int | None] = []
    last_bid: str | None = None
    seq = 0
    for row in items:
        bid = _row_block_id(row)
        if not bid:
            out.append(None)
            last_bid = None
            continue
        if bid != last_bid:
            seq = 0
            last_bid = bid
        out.append(seq)
        seq += 1
    return out


def inject_block_sequences_into_item_dicts(items: list[dict[str, Any]]) -> None:
    """Mutates dicts in place (expects sort_order to reflect final order)."""
    ordered = sorted(items, key=lambda d: d.get("sort_order", 0))
    seqs = block_sequences_for_ordered_items(ordered)
    for d, sq in zip(ordered, seqs):
        d["block_sequence"] = sq


def strip_orphan_workout_blocks(items: list[T]) -> list[T]:
    """Clear block_id when fewer than two rows share it (incomplete pair)."""
    ids = Counter(getattr(x, "block_id", None) for x in items if getattr(x, "block_id", None))
    bad = {k for k, n in ids.items() if n < 2}
    if not bad:
        return items
    out: list[T] = []
    for x in items:
        bid = getattr(x, "block_id", None)
        if bid and bid in bad:
            out.append(x.model_copy(update={"block_id": None, "block_type": None}))  # type: ignore[arg-type]
        else:
            out.append(x)
    return out
