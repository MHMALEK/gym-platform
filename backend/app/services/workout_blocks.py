from collections import Counter
from typing import TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


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
