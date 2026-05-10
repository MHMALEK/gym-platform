"""Coach assistant chat with read-only tools (OpenAI function calling)."""

from __future__ import annotations

import json
from decimal import Decimal
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dashboard import build_dashboard_summary
from app.core.config import settings
from app.models.client import Client
from app.models.coach import Coach
from app.models.exercise import Exercise
from app.models.invoice import Invoice
from app.models.training_plan import TrainingPlan


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
                "Search this coach's exercise library plus the shared catalog by name substring. "
                "Use for any request to find, list, filter, or search exercises by keyword — including "
                "single English or Persian words (e.g. squat, deadlift, اسکات). This is app data lookup, not generic coaching advice."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "q": {
                        "type": "string",
                        "description": "Substring to match on exercise name (e.g. user says 'squat' → q='squat')",
                    },
                    "venue_type": {
                        "type": "string",
                        "enum": ["home", "commercial_gym", "mixed", ""],
                        "description": "Optional venue filter; mixed or empty = no venue filter",
                    },
                    "limit": {"type": "integer", "description": "Max rows (default 25, max 60)"},
                },
                "required": ["q"],
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
    if not q:
        return {"items": []}
    limit = min(max(int(args.get("limit") or 25), 1), 60)
    vt = (args.get("venue_type") or "").strip() or "mixed"
    cond = [_exercise_scope(coach.id)]
    vc = _venue_clause(vt if vt in ("home", "commercial_gym") else None)
    if vc is not None:
        cond.append(vc)
    term = f"%{q}%"
    cond.append(Exercise.name.ilike(term))
    stmt = select(Exercise).where(*cond).order_by(Exercise.name).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return {
        "items": [
            {
                "id": ex.id,
                "name": ex.name,
                "venue_type": ex.venue_type,
                "coach_owned": ex.coach_id is not None,
            }
            for ex in rows
        ]
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
    "search_exercises": _tool_search_exercises,
    "list_training_plans": _tool_list_training_plans,
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

    system = "\n".join(
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
