"""Coach assistant chat with read-only tools (OpenAI function calling).

Public surface:
- `stream_coach_chat_events`: async generator yielding event dicts. Frontend
  uses this via SSE for incremental UI updates.
- `run_coach_chat`: collects the same generator into a single string. Used
  by callers that want a one-shot reply (tests, MCP integration, fallback).
"""

from __future__ import annotations

import json
from collections.abc import AsyncGenerator
from decimal import Decimal
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.orm import selectinload

from app.api.dashboard import build_dashboard_summary
from app.core.config import settings
from app.models.client import Client
from app.models.client_coaching_plan import ClientCoachingPlan
from app.models.client_subscription import ClientSubscription
from app.models.coach import Coach
from app.models.exercise import Exercise
from app.models.exercise_muscle_group import ExerciseMuscleGroup
from app.models.invoice import Invoice
from app.models.muscle_group import MuscleGroup
from app.models.plan_template import PlanTemplate
from app.models.training_plan import TrainingPlan
from app.models.training_plan_item import TrainingPlanItem


def _venue_clause(venue_type: str | None):
    if venue_type == "home":
        return or_(Exercise.venue_type == "home", Exercise.venue_type == "both")
    if venue_type == "commercial_gym":
        return or_(Exercise.venue_type == "commercial_gym", Exercise.venue_type == "both")
    return None


def _exercise_scope(coach_id: int):
    return or_(Exercise.coach_id == coach_id, Exercise.coach_id.is_(None))


def _json_safe(obj: Any) -> Any:
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_json_safe(x) for x in obj]
    return obj


COACH_CHAT_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_dashboard_snapshot",
            "description": "High-level counts for this coach: clients, invoices, memberships, library sizes, overdue/due-soon invoice snippets.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_clients",
            "description": "List clients for this coach with optional name/email search and status filter.",
            "parameters": {
                "type": "object",
                "properties": {
                    "q": {"type": "string", "description": "Search name or email (optional)"},
                    "status": {
                        "type": "string",
                        "description": "Optional filter: active, inactive, or archived",
                    },
                    "limit": {"type": "integer", "description": "Max rows (default 20, max 40)"},
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_client",
            "description": "Fetch one client by id (must belong to this coach). Returns id, name, email, status, goal.",
            "parameters": {
                "type": "object",
                "properties": {"client_id": {"type": "integer"}},
                "required": ["client_id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_exercises",
            "description": (
                "Search this coach's exercise library + the shared catalog. Use for any request to "
                "find, list, filter, or search exercises by name keyword, muscle group, or equipment. "
                "Single English or Persian words (e.g. squat, deadlift, اسکات) are valid name queries. "
                "Use muscle_group / equipment when the coach asks for a category (e.g. 'a hamstring "
                "exercise', 'something with dumbbells'). At least one of q / muscle_group / equipment "
                "should be provided. This is app data lookup, not generic coaching advice."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "q": {
                        "type": "string",
                        "description": "Substring to match on exercise name. Optional.",
                    },
                    "muscle_group": {
                        "type": "string",
                        "description": (
                            "Filter to exercises tagged with this muscle group code or label "
                            "(case-insensitive substring match — e.g. 'hamstring', 'chest', 'glutes')."
                        ),
                    },
                    "equipment": {
                        "type": "string",
                        "description": (
                            "Filter by equipment substring (e.g. 'dumbbell', 'barbell', 'bodyweight', "
                            "'cable', 'kettlebell'). Case-insensitive."
                        ),
                    },
                    "venue_type": {
                        "type": "string",
                        "enum": ["home", "commercial_gym", "mixed", ""],
                        "description": "Optional venue filter; mixed or empty = no venue filter",
                    },
                    "limit": {"type": "integer", "description": "Max rows (default 25, max 60)"},
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_exercise",
            "description": (
                "Fetch full details for one exercise (coach-owned or shared catalog) by id. "
                "Returns name, description, equipment, venue, difficulty, instructions, tips, "
                "common_mistakes, correct_form_cues, body parts, secondary muscles, and the "
                "muscle-group tags. Use after search_exercises when the coach asks 'how do I "
                "cue this?', 'what muscles does X hit?', etc."
            ),
            "parameters": {
                "type": "object",
                "properties": {"exercise_id": {"type": "integer"}},
                "required": ["exercise_id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_training_plans",
            "description": "List this coach's training plans (name + venue + id). Optional name search.",
            "parameters": {
                "type": "object",
                "properties": {
                    "q": {"type": "string", "description": "Optional substring on plan name"},
                    "limit": {"type": "integer", "description": "Max rows (default 20, max 50)"},
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_training_plan",
            "description": (
                "Fetch the full contents of a training plan: every exercise with its sets, reps, "
                "rest, weight, RPE, tempo, notes, and block grouping (superset / circuit / etc.). "
                "Use when the coach asks what's in a plan, what does a workout look like, or wants "
                "to compare programs."
            ),
            "parameters": {
                "type": "object",
                "properties": {"plan_id": {"type": "integer"}},
                "required": ["plan_id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_client_plans",
            "description": (
                "Fetch what's assigned to a single client: their assigned training plan id + name, "
                "the workout / diet free-text notes from their coaching plan row, and active "
                "membership subscriptions (plan template + start/end dates)."
            ),
            "parameters": {
                "type": "object",
                "properties": {"client_id": {"type": "integer"}},
                "required": ["client_id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_invoices",
            "description": "List invoices for this coach's clients with optional status filter.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["pending", "paid", "overdue", ""],
                        "description": "Optional status filter",
                    },
                    "limit": {"type": "integer", "description": "Max rows (default 20, max 50)"},
                },
                "additionalProperties": False,
            },
        },
    },
]


async def _tool_get_dashboard_snapshot(db: AsyncSession, coach: Coach, _: dict[str, Any]) -> dict[str, Any]:
    summary = await build_dashboard_summary(coach, db)
    data = summary.model_dump()
    # trim heavy lists for model context
    data["finance_overdue"] = data.get("finance_overdue", [])[:8]
    data["finance_due_soon"] = data.get("finance_due_soon", [])[:8]
    return _json_safe(data)


async def _tool_list_clients(db: AsyncSession, coach: Coach, args: dict[str, Any]) -> dict[str, Any]:
    limit = min(max(int(args.get("limit") or 20), 1), 40)
    q = (args.get("q") or "").strip()
    status = (args.get("status") or "").strip() or None
    cond = [Client.coach_id == coach.id]
    if status:
        cond.append(Client.status == status)
    if q:
        like = f"%{q}%"
        cond.append(or_(Client.name.ilike(like), Client.email.ilike(like)))
    total = (await db.execute(select(func.count()).select_from(Client).where(*cond))).scalar_one()
    stmt = select(Client).where(*cond).order_by(Client.name).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    items = [
        {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "status": c.status,
            "goal": (c.goal or "")[:200] if c.goal else None,
        }
        for c in rows
    ]
    return {"total": total, "items": items}


async def _tool_get_client(db: AsyncSession, coach: Coach, args: dict[str, Any]) -> dict[str, Any]:
    cid = int(args["client_id"])
    result = await db.execute(select(Client).where(Client.id == cid, Client.coach_id == coach.id))
    c = result.scalar_one_or_none()
    if not c:
        return {"error": "client_not_found"}
    return {
        "id": c.id,
        "name": c.name,
        "email": c.email,
        "phone": c.phone,
        "status": c.status,
        "goal": c.goal,
        "notes": (c.notes or "")[:500] if c.notes else None,
        "billing_preference": c.billing_preference,
    }


async def _tool_search_exercises(db: AsyncSession, coach: Coach, args: dict[str, Any]) -> dict[str, Any]:
    q = (args.get("q") or "").strip()
    muscle_q = (args.get("muscle_group") or "").strip()
    equipment_q = (args.get("equipment") or "").strip()
    if not (q or muscle_q or equipment_q):
        return {"items": [], "_note": "provide at least one of q / muscle_group / equipment"}
    limit = min(max(int(args.get("limit") or 25), 1), 60)
    vt = (args.get("venue_type") or "").strip() or "mixed"
    cond = [_exercise_scope(coach.id)]
    vc = _venue_clause(vt if vt in ("home", "commercial_gym") else None)
    if vc is not None:
        cond.append(vc)
    if q:
        cond.append(Exercise.name.ilike(f"%{q}%"))
    if equipment_q:
        cond.append(Exercise.equipment.ilike(f"%{equipment_q}%"))
    stmt = (
        select(Exercise)
        .options(selectinload(Exercise.muscle_links).selectinload(ExerciseMuscleGroup.muscle_group))
        .where(*cond)
        .order_by(Exercise.name)
        .limit(limit * 2 if muscle_q else limit)  # fetch extra so post-filter still has volume
    )
    rows = (await db.execute(stmt)).scalars().all()

    def _muscle_labels(ex: Exercise) -> list[str]:
        out: list[str] = []
        for link in ex.muscle_links or []:
            mg = link.muscle_group
            if mg is None:
                continue
            if mg.label:
                out.append(mg.label)
            elif mg.code:
                out.append(mg.code)
        return out

    if muscle_q:
        needle = muscle_q.lower()
        rows = [
            ex
            for ex in rows
            if any(needle in (label or "").lower() for label in _muscle_labels(ex))
            or any(
                needle in (link.muscle_group.code or "").lower()
                for link in (ex.muscle_links or [])
                if link.muscle_group is not None
            )
        ]
    rows = rows[:limit]
    return {
        "items": [
            {
                "id": ex.id,
                "name": ex.name,
                "venue_type": ex.venue_type,
                "equipment": ex.equipment,
                "muscle_groups": _muscle_labels(ex),
                "coach_owned": ex.coach_id is not None,
            }
            for ex in rows
        ]
    }


async def _tool_get_exercise(db: AsyncSession, coach: Coach, args: dict[str, Any]) -> dict[str, Any]:
    eid = int(args["exercise_id"])
    stmt = (
        select(Exercise)
        .options(selectinload(Exercise.muscle_links).selectinload(ExerciseMuscleGroup.muscle_group))
        .where(Exercise.id == eid, _exercise_scope(coach.id))
    )
    ex = (await db.execute(stmt)).scalar_one_or_none()
    if not ex:
        return {"error": "exercise_not_found"}
    muscle_groups = []
    for link in ex.muscle_links or []:
        mg = link.muscle_group
        if mg is None:
            continue
        muscle_groups.append({"code": mg.code, "label": mg.label})
    return {
        "id": ex.id,
        "name": ex.name,
        "description": ex.description,
        "category": ex.category,
        "equipment": ex.equipment,
        "venue_type": ex.venue_type,
        "difficulty": ex.difficulty,
        "exercise_type": ex.exercise_type,
        "muscle_groups": muscle_groups,
        "body_parts": ex.body_parts,
        "secondary_muscles": ex.secondary_muscles,
        "instructions": ex.instructions,
        "tips": ex.tips,
        "common_mistakes": ex.common_mistakes,
        "correct_form_cues": ex.correct_form_cues,
        "setup_notes": ex.setup_notes,
        "safety_notes": ex.safety_notes,
        "coach_owned": ex.coach_id is not None,
    }


async def _tool_list_training_plans(db: AsyncSession, coach: Coach, args: dict[str, Any]) -> dict[str, Any]:
    limit = min(max(int(args.get("limit") or 20), 1), 50)
    q = (args.get("q") or "").strip()
    cond = [TrainingPlan.coach_id == coach.id]
    if q:
        cond.append(TrainingPlan.name.ilike(f"%{q}%"))
    total = (await db.execute(select(func.count()).select_from(TrainingPlan).where(*cond))).scalar_one()
    stmt = select(TrainingPlan).where(*cond).order_by(TrainingPlan.name).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return {
        "total": total,
        "items": [{"id": p.id, "name": p.name, "venue_type": p.venue_type} for p in rows],
    }


async def _tool_get_training_plan(db: AsyncSession, coach: Coach, args: dict[str, Any]) -> dict[str, Any]:
    pid = int(args["plan_id"])
    plan_stmt = (
        select(TrainingPlan)
        .options(
            selectinload(TrainingPlan.items).selectinload(TrainingPlanItem.exercise),
        )
        .where(TrainingPlan.id == pid, TrainingPlan.coach_id == coach.id)
    )
    plan = (await db.execute(plan_stmt)).scalar_one_or_none()
    if not plan:
        return {"error": "training_plan_not_found"}

    # Sort items by sort_order; the model can interpret rows directly.
    sorted_items = sorted(plan.items or [], key=lambda x: x.sort_order)
    items_out: list[dict[str, Any]] = []
    for it in sorted_items:
        items_out.append(
            {
                "row_type": it.row_type,  # legacy_line | exercise (head) | set
                "exercise_id": it.exercise_id,
                "exercise_name": it.exercise.name if it.exercise else None,
                "block_id": it.block_id,
                "block_type": it.block_type,
                "sets": it.sets,
                "reps": it.reps,
                "duration_sec": it.duration_sec,
                "rest_sec": it.rest_sec,
                "weight_kg": it.weight_kg,
                "rpe": it.rpe,
                "tempo": it.tempo,
                "notes": (it.notes[:200] if it.notes else None),
            }
        )
    return {
        "id": plan.id,
        "name": plan.name,
        "description": plan.description,
        "venue_type": plan.venue_type,
        "items": items_out,
    }


async def _tool_list_client_plans(db: AsyncSession, coach: Coach, args: dict[str, Any]) -> dict[str, Any]:
    cid = int(args["client_id"])
    # Verify the client belongs to this coach.
    client = (
        await db.execute(select(Client).where(Client.id == cid, Client.coach_id == coach.id))
    ).scalar_one_or_none()
    if not client:
        return {"error": "client_not_found"}

    # Coaching plan row (per-client free-text + assigned plan id).
    coaching_plan = (
        await db.execute(select(ClientCoachingPlan).where(ClientCoachingPlan.client_id == cid))
    ).scalar_one_or_none()

    # Resolve assigned training plan name when present.
    assigned_plan_name: str | None = None
    if coaching_plan and coaching_plan.assigned_training_plan_id:
        tp = (
            await db.execute(
                select(TrainingPlan).where(
                    TrainingPlan.id == coaching_plan.assigned_training_plan_id,
                    TrainingPlan.coach_id == coach.id,
                )
            )
        ).scalar_one_or_none()
        if tp:
            assigned_plan_name = tp.name

    # Active subscriptions (memberships).
    subs = (
        await db.execute(
            select(ClientSubscription, PlanTemplate)
            .join(PlanTemplate, PlanTemplate.id == ClientSubscription.plan_template_id)
            .where(ClientSubscription.client_id == cid)
            .order_by(ClientSubscription.starts_at.desc())
            .limit(8)
        )
    ).all()
    subs_out = [
        {
            "subscription_id": sub.id,
            "plan_template_id": pt.id,
            "plan_template_name": pt.name,
            "status": sub.status,
            "starts_at": sub.starts_at.isoformat() if sub.starts_at else None,
            "ends_at": sub.ends_at.isoformat() if sub.ends_at else None,
        }
        for sub, pt in subs
    ]

    return {
        "client_id": client.id,
        "client_name": client.name,
        "assigned_training_plan_id": coaching_plan.assigned_training_plan_id if coaching_plan else None,
        "assigned_training_plan_name": assigned_plan_name,
        "workout_notes": (
            (coaching_plan.workout_plan or "")[:1000]
            if coaching_plan and coaching_plan.workout_plan
            else None
        ),
        "diet_notes": (
            (coaching_plan.diet_plan or "")[:1000]
            if coaching_plan and coaching_plan.diet_plan
            else None
        ),
        "subscriptions": subs_out,
    }


async def _tool_list_invoices(db: AsyncSession, coach: Coach, args: dict[str, Any]) -> dict[str, Any]:
    limit = min(max(int(args.get("limit") or 20), 1), 50)
    status = (args.get("status") or "").strip() or None
    cond = [Client.coach_id == coach.id]
    j = select(Invoice, Client.name).join(Client, Client.id == Invoice.client_id).where(*cond)
    if status:
        j = j.where(Invoice.status == status)
    stmt = j.order_by(Invoice.due_date.desc().nullslast(), Invoice.id.desc()).limit(limit)
    rows = (await db.execute(stmt)).all()
    out = []
    for inv, cname in rows[:limit]:
        out.append(
            {
                "id": inv.id,
                "reference": inv.reference,
                "client_id": inv.client_id,
                "client_name": cname,
                "amount": float(inv.amount) if inv.amount is not None else None,
                "currency": inv.currency,
                "status": inv.status,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
            }
        )
    return {"items": out}


_TOOL_DISPATCH = {
    "get_dashboard_snapshot": _tool_get_dashboard_snapshot,
    "list_clients": _tool_list_clients,
    "get_client": _tool_get_client,
    "list_client_plans": _tool_list_client_plans,
    "search_exercises": _tool_search_exercises,
    "get_exercise": _tool_get_exercise,
    "list_training_plans": _tool_list_training_plans,
    "get_training_plan": _tool_get_training_plan,
    "list_invoices": _tool_list_invoices,
}


def _chat_chars(messages: list[dict[str, str]]) -> int:
    return sum(len(m.get("content") or "") for m in messages)


# Soft cap on a single tool result. We trim by whole items instead of mid-string
# so the model never receives a JSON fragment that errors out parsing.
_TOOL_RESULT_CHAR_BUDGET = 8000


def _serialize_tool_result(payload: Any) -> str:
    """Serialize a tool payload to JSON, dropping items from `items` until it
    fits the char budget. Always returns a syntactically valid JSON string."""
    safe = _json_safe(payload)
    encoded = json.dumps(safe, default=str)
    if len(encoded) <= _TOOL_RESULT_CHAR_BUDGET:
        return encoded
    if isinstance(safe, dict) and isinstance(safe.get("items"), list):
        items = safe["items"]
        # Halve the list until it fits, marking the truncation in `_truncated`.
        while len(items) > 1:
            items = items[: max(1, len(items) // 2)]
            trimmed = {**safe, "items": items, "_truncated": True}
            candidate = json.dumps(trimmed, default=str)
            if len(candidate) <= _TOOL_RESULT_CHAR_BUDGET:
                return candidate
        return json.dumps(
            {**safe, "items": items[:1], "_truncated": True}, default=str
        )
    # Last resort: return a marker rather than a malformed JSON fragment.
    return json.dumps(
        {"_truncated": True, "_note": "Tool result exceeded budget; rerun with a smaller limit."},
        default=str,
    )


def _assistant_to_dict(msg: Any) -> dict[str, Any]:
    out: dict[str, Any] = {"role": "assistant", "content": msg.content or ""}
    tcs = getattr(msg, "tool_calls", None)
    if tcs:
        out["tool_calls"] = [
            {
                "id": tc.id,
                "type": "function",
                "function": {"name": tc.function.name, "arguments": tc.function.arguments or "{}"},
            }
            for tc in tcs
        ]
    return out


def _language_guidance_for_chat(locale: str | None) -> str:
    loc = (locale or "").strip()
    hint = f'App UI locale (BCP-47): "{loc}". ' if loc else ""
    return "\n".join(
        [
            hint
            + "Language: write assistant replies in the same natural language as the user's messages when that language is clear.",
            "If a message mixes languages or is too short to infer, use the app UI locale tag (tags starting with "
            '"fa" → Persian/Farsi; otherwise prefer English).',
            "Refusals, apologies, and bullet lists must follow the same language choice.",
            "Proper nouns, numeric IDs, and tool JSON strings may stay as returned by tools.",
        ]
    )


def _build_system_prompt(locale: str | None) -> str:
    """Single source of truth for the system prompt; used by both streaming
    and non-streaming paths."""
    return "\n".join(
        [
            "You are Gym Coach, an in-app assistant for personal trainers. You do TWO things:",
            "  (a) Look up data from THIS coach's app (clients, invoices, training plans, exercises, "
            "dashboard) using the provided tools.",
            "  (b) Answer general strength-and-conditioning / coaching / programming questions concisely "
            "from your own training knowledge — supersets, periodization, RPE, warm-ups, programming a "
            "block, exercise selection rationale, etc. You do NOT need a tool for these.",
            "",
            "Use tools when the question is about THIS coach's specific data (e.g. 'how many active clients', "
            "'what's in client X's plan', 'overdue invoices', 'find a hamstring exercise in my library'). "
            "Don't invent client names, invoice amounts, exercise ids, or tool results — only state app data "
            "that came back from a tool call.",
            "",
            "Refuse only clearly unrelated requests (news, coding help, homework, other apps, medical "
            "diagnosis, legal advice). For those, briefly say you focus on coaching topics + their app data.",
            "",
            "Domain vocabulary you should know and use naturally when relevant: ",
            "  - rep schemes: strength 3-6, hypertrophy 6-12, endurance 12+; sets often 3-5",
            "  - rest: strength ~2-5 min, hypertrophy ~60-90s, conditioning ~30-60s",
            "  - intensity: %1RM, RPE (1-10) and RIR (reps in reserve, 0-4); RPE 8 ≈ 2 RIR",
            "  - tempo notation '3-1-1-0' = 3s eccentric / 1s pause / 1s concentric / 1s pause",
            "  - block types: superset, tri-set, giant set, circuit, drop set, cluster set, AMRAP",
            "  - structure: warm-up, main lifts, accessories, conditioning, cool-down",
            "  - planning: linear vs undulating periodization, deload weeks (typically every 4-6 weeks)",
            "  - movement patterns: squat / hinge / push / pull / carry / lunge / rotation",
            "",
            "Be concise. Bullet lists for multiple rows or items. Plain prose for single answers and "
            "programming explanations.",
            "Exercises may be coach-owned or from the shared catalog (coach_owned: false).",
            _language_guidance_for_chat(locale),
        ]
    )


async def run_coach_chat(
    db: AsyncSession,
    coach: Coach,
    messages: list[dict[str, str]],
    *,
    optional_context: str | None = None,
    locale: str | None = None,
) -> str:
    if not settings.openai_api_key or not settings.openai_api_key.strip():
        raise RuntimeError("AI is not configured (missing OPENAI_API_KEY).")

    if len(messages) > settings.ai_coach_chat_max_messages:
        raise ValueError("Too many messages.")
    if _chat_chars(messages) > settings.ai_coach_chat_max_chars:
        raise ValueError("Message content is too long.")

    client = AsyncOpenAI(
        api_key=settings.openai_api_key.strip(),
        base_url=settings.openai_base_url.strip() if settings.openai_base_url else None,
    )

    system = _build_system_prompt(locale)
    if optional_context:
        system = (
            f"{system}\n\n---\nSession context from the coach (any language; use only to interpret questions; "
            f"still use tools for factual data). Reply language rules above still apply.\n{optional_context}"
        )
    oai_messages: list[Any] = [{"role": "system", "content": system}, *messages]

    # 4 rounds is plenty for the typical chain (e.g. list_clients -> get_client +
    # list_invoices) without letting a weak tool-pick spiral. 1024 tokens fits any
    # concise reply; bullet lists with all data still fit comfortably.
    max_rounds = 4
    last_text = ""

    for _ in range(max_rounds):
        completion = await client.chat.completions.create(
            model=settings.openai_chat_model,
            messages=oai_messages,
            tools=COACH_CHAT_TOOLS,
            tool_choice="auto",
            temperature=0.25,
            max_tokens=1024,
        )
        choice = completion.choices[0]
        msg = choice.message
        tcs = getattr(msg, "tool_calls", None) or []

        if not tcs:
            last_text = (msg.content or "").strip()
            break

        oai_messages.append(_assistant_to_dict(msg))
        for tc in tcs:
            name = tc.function.name
            raw_args = tc.function.arguments or "{}"
            try:
                args = json.loads(raw_args)
            except json.JSONDecodeError:
                args = {}
            fn = _TOOL_DISPATCH.get(name)
            if not fn:
                payload = {"error": "unknown_tool", "name": name}
            else:
                try:
                    payload = await fn(db, coach, args if isinstance(args, dict) else {})
                except Exception as e:
                    payload = {"error": str(e)[:500]}
            oai_messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": _serialize_tool_result(payload),
                }
            )

    if not last_text:
        last_text = (
            "I could not produce a reply. Ask something about your clients, invoices, training plans, "
            "or exercises in Gym Coach."
        )
    return last_text
