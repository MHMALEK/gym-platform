"""LLM-backed flat workout draft (legacy_line) for coach training plans."""

from __future__ import annotations

import json
import re
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.coach import Coach
from app.models.exercise import Exercise
from app.schemas.ai_workout import (
    ExerciseCandidateOut,
    ExerciseIdMappingFromLLM,
    ResolvedPlanLineOut,
    TrainingPlanDraftRequest,
    TrainingPlanDraftResponse,
    UnresolvedExerciseOut,
    WorkoutDraftFromLLM,
)


_JSON_INSTRUCTIONS = """You must respond with a single JSON object only (no markdown fences), using this exact shape:
{
  "plan_name": string (short title for the training plan),
  "plan_description": string or null (one-line summary for lists),
  "assistant_summary": string or null (one short sentence for the coach),
  "items": [
    {
      "exercise_name": string (short library-style name, e.g. "Bench press" or "Lat pulldown"),
      "sets": integer or null,
      "reps": integer or null,
      "duration_sec": integer or null,
      "rest_sec": integer or null,
      "notes": string or null
    }
  ]
}
Rules:
- 4–20 items unless the user explicitly asks for fewer or more (cap at 24 items).
- Prefer realistic set/rep schemes; use null when unknown.
- exercise_name: use SHORT names that match the shared exercise catalog or common coaching terms (Bench press, Lat pulldown, Leg curl). Avoid long slash/or lists — pick one primary name per row.
"""


def _venue_sentence(venue_type: str) -> str:
    if venue_type == "home":
        return "The program venue is HOME — prefer bodyweight, dumbbells, bands, and minimal equipment."
    if venue_type == "commercial_gym":
        return "The program venue is a COMMERCIAL GYM — machines and barbells are fine."
    return "The program venue is MIXED — balance home-friendly and gym options."


def _total_message_chars(messages: list[Any]) -> int:
    return sum(len(m.content) for m in messages)


def _normalize_words(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9\s-]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _significant_tokens(text: str) -> list[str]:
    """Words of length >= 3 for loose DB matching (stop very common glue words)."""
    n = _normalize_words(text.replace("-", " "))
    stop = {"the", "and", "for", "with", "using", "per", "each", "via"}
    out: list[str] = []
    for p in n.split():
        if len(p) >= 3 and p not in stop and p not in out:
            out.append(p)
        if len(out) >= 10:
            break
    return out


def _name_variants(raw: str) -> list[str]:
    """Try alternate phrasing the model uses (e.g. 'A or B')."""
    s = (raw or "").strip()
    if not s:
        return []
    out: list[str] = []
    for part in re.split(r"\s+or\s+", s, flags=re.I):
        p = part.strip()
        if p and p not in out:
            out.append(p)
    return out[:5] if len(out) > 1 else [s]


def _score_name_match(query_norm: str, exercise_name: str, query_tokens: frozenset[str]) -> float:
    name_raw = exercise_name.strip().lower()
    name = _normalize_words(exercise_name.replace("-", " "))
    qn = _normalize_words(query_norm.replace("-", " "))
    if name_raw == query_norm.strip().lower():
        return 100.0
    if name == qn:
        return 99.0
    if name.startswith(qn) or qn.startswith(name):
        return 88.0
    if qn in name or name in qn:
        return 76.0
    q_parts = [p for p in qn.split() if len(p) > 2]
    if q_parts and all(p in name for p in q_parts):
        return 62.0
    if query_tokens:
        name_tokens = frozenset(p for p in name.split() if len(p) >= 2)
        inter = query_tokens & name_tokens
        if len(inter) >= 2 and len(inter) / max(len(query_tokens), 1) >= 0.5:
            return 52.0 + min(10.0, float(len(inter)) * 2.0)
        if len(inter) >= 2:
            return 48.0 + float(len(inter))
    return 0.0


def _coach_library_or_catalog_clause(coach_id: int):
    """Master catalog (coach_id NULL) plus this coach's copies — matches plan item validation."""
    return or_(Exercise.coach_id == coach_id, Exercise.coach_id.is_(None))


def _venue_clause(venue_type: str):
    if venue_type == "home":
        return or_(Exercise.venue_type == "home", Exercise.venue_type == "both")
    if venue_type == "commercial_gym":
        return or_(Exercise.venue_type == "commercial_gym", Exercise.venue_type == "both")
    return None


async def _fetch_exercise_candidates(
    db: AsyncSession,
    coach_id: int,
    query: str,
    venue_type: str,
    *,
    search_limit: int = 40,
) -> list[Exercise]:
    q = (query or "").strip()
    if not q:
        return []
    cond = [_coach_library_or_catalog_clause(coach_id)]
    vc = _venue_clause(venue_type)
    if vc is not None:
        cond.append(vc)
    term = f"%{q}%"
    cond.append(
        or_(
            Exercise.name.ilike(term),
            Exercise.description.ilike(term),
        )
    )
    stmt = select(Exercise).where(*cond).order_by(Exercise.name).limit(search_limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def _fetch_exercise_candidates_token_union(
    db: AsyncSession,
    coach_id: int,
    tokens: list[str],
    venue_type: str,
    *,
    search_limit: int = 120,
) -> list[Exercise]:
    """Match exercises whose name contains ANY significant token (union), then rank in Python."""
    toks = [t for t in tokens if len(t) >= 3][:8]
    if not toks:
        return []
    cond = [_coach_library_or_catalog_clause(coach_id)]
    vc = _venue_clause(venue_type)
    if vc is not None:
        cond.append(vc)
    cond.append(or_(*[Exercise.name.ilike(f"%{t}%") for t in toks]))
    stmt = select(Exercise).where(*cond).order_by(Exercise.name).limit(search_limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def _fetch_exercise_candidates_token_and(
    db: AsyncSession,
    coach_id: int,
    tokens: list[str],
    venue_type: str,
    *,
    search_limit: int = 80,
) -> list[Exercise]:
    """Stricter: name must contain ALL given tokens (good for 'bench' + 'press')."""
    toks = [t for t in tokens if len(t) >= 3][:5]
    if len(toks) < 2:
        return []
    cond = [_coach_library_or_catalog_clause(coach_id)]
    vc = _venue_clause(venue_type)
    if vc is not None:
        cond.append(vc)
    cond.append(and_(*[Exercise.name.ilike(f"%{t}%") for t in toks]))
    stmt = select(Exercise).where(*cond).order_by(Exercise.name).limit(search_limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def resolve_exercise_name(
    db: AsyncSession,
    coach_id: int,
    raw_name: str,
    venue_type: str,
) -> tuple[Exercise | None, list[Exercise]]:
    """Return (best_match, candidates_for_ui) if ambiguous."""
    name = (raw_name or "").strip()
    if not name:
        return None, []

    seen: dict[int, Exercise] = {}
    for variant in _name_variants(name):
        for row in await _fetch_exercise_candidates(db, coach_id, variant, venue_type, search_limit=50):
            seen[row.id] = row
        toks = _significant_tokens(variant)
        if len(toks) >= 2:
            for row in await _fetch_exercise_candidates_token_and(
                db, coach_id, toks, venue_type, search_limit=80
            ):
                seen[row.id] = row
        if toks:
            for row in await _fetch_exercise_candidates_token_union(
                db, coach_id, toks, venue_type, search_limit=120
            ):
                seen[row.id] = row

    rows = list(seen.values())
    if not rows:
        return None, []

    qn = _normalize_words(name)
    q_tokens = frozenset(_significant_tokens(name))
    scored: list[tuple[float, Exercise]] = []
    for ex in rows:
        s = _score_name_match(qn, ex.name, q_tokens)
        if ex.coach_id == coach_id:
            s += 2.5  # prefer coach-owned copy when tied with same-named catalog row
        if s > 0:
            scored.append((s, ex))
    scored.sort(key=lambda x: (-x[0], x[1].name.lower()))
    if not scored:
        rows.sort(key=lambda e: e.name.lower())
        return None, rows[:8]
    best_score, best = scored[0]
    second = scored[1][0] if len(scored) > 1 else 0.0
    if best_score >= 70:
        return best, []
    if best_score >= 58 and best_score - second >= 10:
        return best, []
    if best_score >= 52 and best_score - second >= 15:
        return best, []
    top = [ex for _, ex in scored[:8]]
    return None, top if top else rows[:8]


_AI_TABLE_CHAR_BUDGET = 95_000


async def _load_context_exercises_for_mapping(
    db: AsyncSession,
    coach_id: int,
    venue_type: str,
    draft: WorkoutDraftFromLLM,
    *,
    max_rows: int = 420,
) -> list[Exercise]:
    """Rows the second LLM may assign: coach library + catalog, venue-aware, token-biased + alphabetical fill."""
    tokens: list[str] = []
    for it in draft.items:
        tokens.extend(_significant_tokens(it.exercise_name))
    seen_t: set[str] = set()
    uniq_tokens: list[str] = []
    for t in tokens:
        if t not in seen_t:
            seen_t.add(t)
            uniq_tokens.append(t)
    uniq_tokens = uniq_tokens[:24]

    base = [_coach_library_or_catalog_clause(coach_id)]
    vc = _venue_clause(venue_type)
    if vc is not None:
        base.append(vc)

    rows: dict[int, Exercise] = {}

    if uniq_tokens:
        tok_cond = or_(*[Exercise.name.ilike(f"%{t}%") for t in uniq_tokens])
        stmt = (
            select(Exercise).where(and_(*base, tok_cond)).order_by(Exercise.name).limit(max_rows)
        )
        result = await db.execute(stmt)
        for ex in result.scalars().all():
            rows[ex.id] = ex

    if len(rows) < 80:
        stmt2 = select(Exercise).where(and_(*base)).order_by(Exercise.name).limit(max_rows)
        result2 = await db.execute(stmt2)
        for ex in result2.scalars().all():
            if len(rows) >= max_rows:
                break
            rows.setdefault(ex.id, ex)

    return list(rows.values())


def _format_exercise_table_tsv(exercises: list[Exercise]) -> str:
    lines: list[str] = ["id\tname"]
    for ex in sorted(exercises, key=lambda e: (e.name.lower(), e.id)):
        safe = (ex.name or "").replace("\t", " ").replace("\n", " ").replace("\r", " ").strip()
        if not safe:
            continue
        lines.append(f"{ex.id}\t{safe}")
    body = "\n".join(lines)
    if len(body) <= _AI_TABLE_CHAR_BUDGET:
        return body
    return body[:_AI_TABLE_CHAR_BUDGET] + "\n# ... table truncated for size; ids above are still valid."


async def _llm_map_exercise_ids(
    client: AsyncOpenAI,
    draft: WorkoutDraftFromLLM,
    table_tsv: str,
) -> ExerciseIdMappingFromLLM | None:
    """Second pass: pick exercise_id per line from the given table only."""
    n = len(draft.items)
    if n == 0:
        return None
    lines_payload = json.dumps(
        [{"line_index": i, "exercise_name": draft.items[i].exercise_name} for i in range(n)],
        ensure_ascii=False,
    )
    sys = "\n".join(
        [
            "You map each workout draft line to one exercise from the TABLE.",
            "Rules:",
            "- Output JSON only: an object with key \"mappings\" whose value is an array.",
            f"- mappings must contain exactly {n} objects, with line_index 0 through {n - 1} each exactly once.",
            "- Each exercise_id must be an integer copied from the TABLE's first column, or null if nothing fits.",
            "- Never invent ids. Never use an id that does not appear in the TABLE.",
            "- Choose the semantically closest exercise (e.g. leg curl is not a bicep curl).",
        ]
    )
    user = f"N={n}\n\nTABLE (tab-separated id then name):\n{table_tsv}\n\nDRAFT_LINES:\n{lines_payload}"
    try:
        completion = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": sys},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0.12,
            max_tokens=4096,
        )
    except Exception:
        return None
    raw = completion.choices[0].message.content
    if not raw or not raw.strip():
        return None
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return None
    try:
        return ExerciseIdMappingFromLLM.model_validate(payload)
    except Exception:
        return None


def _normalize_mapping_by_index(
    mapping: ExerciseIdMappingFromLLM | None,
    expected_n: int,
) -> dict[int, int | None]:
    if not mapping or not mapping.mappings:
        return {}
    out: dict[int, int | None] = {}
    for row in mapping.mappings:
        if 0 <= row.line_index < expected_n:
            out[row.line_index] = row.exercise_id
    return out


async def generate_training_plan_draft(
    db: AsyncSession,
    coach: Coach,
    body: TrainingPlanDraftRequest,
) -> TrainingPlanDraftResponse:
    if not settings.openai_api_key or not settings.openai_api_key.strip():
        raise RuntimeError("AI is not configured (missing OPENAI_API_KEY).")

    if len(body.messages) > settings.ai_workout_max_messages:
        raise ValueError("Too many messages in this request.")
    total_chars = _total_message_chars(body.messages)
    if total_chars > settings.ai_workout_max_total_chars:
        raise ValueError("Message content is too long.")

    client = AsyncOpenAI(
        api_key=settings.openai_api_key.strip(),
        base_url=settings.openai_base_url.strip() if settings.openai_base_url else None,
    )

    system = "\n".join(
        [
            "You are an expert strength and conditioning coach helping another coach draft a training plan inside their app.",
            "The app matches each exercise_name to the shared exercise catalog (master list) AND your personal library, using the words in the name — prefer short, standard names (Bench press, Cable row, Triceps pushdown).",
            _venue_sentence(body.venue_type),
            _JSON_INSTRUCTIONS,
        ]
    )
    oai_messages: list[dict[str, str]] = [{"role": "system", "content": system}]
    for m in body.messages:
        oai_messages.append({"role": m.role, "content": m.content})

    try:
        completion = await client.chat.completions.create(
            model=settings.openai_model,
            messages=oai_messages,
            response_format={"type": "json_object"},
            temperature=0.35,
            max_tokens=4096,
        )
    except Exception as e:
        raise RuntimeError(f"Upstream model error: {e!s}") from e

    raw = completion.choices[0].message.content
    if not raw or not raw.strip():
        raise RuntimeError("Empty model response.")
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError("Model returned invalid JSON.") from e

    try:
        draft = WorkoutDraftFromLLM.model_validate(payload)
    except Exception as e:
        raise ValueError("Model JSON did not match the expected workout draft shape.") from e

    context_exercises = await _load_context_exercises_for_mapping(
        db, coach.id, body.venue_type, draft
    )
    allowed_ids = {e.id for e in context_exercises}
    by_id = {e.id: e for e in context_exercises}
    table_tsv = _format_exercise_table_tsv(context_exercises)
    mapping_model = await _llm_map_exercise_ids(client, draft, table_tsv)
    mapped_idx = _normalize_mapping_by_index(mapping_model, len(draft.items))

    lines: list[ResolvedPlanLineOut] = []
    unresolved: list[UnresolvedExerciseOut] = []

    for i, row in enumerate(draft.items):
        ex: Exercise | None = None
        chosen_id = mapped_idx.get(i)
        if chosen_id is not None and chosen_id in allowed_ids:
            ex = by_id.get(chosen_id)
        if ex is None:
            ex, cands = await resolve_exercise_name(
                db, coach.id, row.exercise_name, body.venue_type
            )
            if ex is None:
                unresolved.append(
                    UnresolvedExerciseOut(
                        requested_name=row.exercise_name.strip(),
                        candidates=[
                            ExerciseCandidateOut(id=c.id, name=c.name) for c in cands[:6]
                        ],
                    )
                )
                continue
        lines.append(
            ResolvedPlanLineOut(
                exercise_id=ex.id,
                sort_order=len(lines),
                sets=row.sets,
                reps=row.reps,
                duration_sec=row.duration_sec,
                rest_sec=row.rest_sec,
                notes=row.notes,
                row_type="legacy_line",
                exercise={"id": ex.id, "name": ex.name},
            )
        )

    return TrainingPlanDraftResponse(
        plan_name=draft.plan_name.strip(),
        plan_description=(draft.plan_description or "").strip() or None,
        assistant_summary=(draft.assistant_summary or "").strip() or None,
        lines=lines,
        unresolved=unresolved,
    )
