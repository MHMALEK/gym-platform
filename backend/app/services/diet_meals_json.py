"""Parse / serialize structured diet meals for JSON text columns."""

import json

from app.schemas.client import DietMeal


def parse_diet_meals_raw(raw: str | None) -> list[DietMeal]:
    if not raw or not str(raw).strip():
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    out: list[DietMeal] = []
    for x in data:
        if not isinstance(x, dict):
            continue
        try:
            out.append(DietMeal.model_validate(x))
        except Exception:
            continue
    return out


def diet_meals_to_json_column(meals: list[DietMeal] | None) -> str | None:
    if meals is None:
        return None
    normalized: list[dict] = []
    for idx, m in enumerate(sorted(meals, key=lambda z: z.sort_order)):
        d = m.model_dump()
        d["sort_order"] = idx
        normalized.append(d)
    return json.dumps(normalized) if normalized else None
