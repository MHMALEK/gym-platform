"""Shared coach tool registry for in-app AI assistant and MCP."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.coach import Coach
from app.models.invoice import Invoice
from app.models.plan_template import PlanTemplate
from app.models.training_plan import TrainingPlan
from app.models.training_plan_item import TrainingPlanItem
from app.services.ai_coach_chat import COACH_CHAT_TOOLS, _TOOL_DISPATCH as _READ_DISPATCH
from app.services.invoice_billing import mark_paid_timestamp
from app.services.invoice_events import emit_invoice_event
from app.services.invoice_numbering import allocate_next_reference


def _json_safe(obj: Any) -> Any:
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, date):
        return obj.isoformat()
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_json_safe(x) for x in obj]
    return obj


MCP_WRITE_TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "create_client",
        "description": "Create a new client for this coach. Only name is required.",
        "mutating": True,
        "assistant": False,
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "email": {"type": "string"},
                "phone": {"type": "string"},
                "notes": {"type": "string"},
                "status": {"type": "string", "description": "active, inactive, or archived"},
            },
            "required": ["name"],
            "additionalProperties": False,
        },
    },
    {
        "name": "update_client",
        "description": "Update fields on an existing client (must belong to this coach).",
        "mutating": True,
        "assistant": False,
        "parameters": {
            "type": "object",
            "properties": {
                "client_id": {"type": "integer"},
                "name": {"type": "string"},
                "email": {"type": "string"},
                "phone": {"type": "string"},
                "notes": {"type": "string"},
                "status": {"type": "string"},
                "account_status": {"type": "string"},
                "goal": {"type": "string"},
            },
            "required": ["client_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "create_invoice",
        "description": "Create an invoice for a client. Reference is auto-generated if omitted.",
        "mutating": True,
        "assistant": False,
        "parameters": {
            "type": "object",
            "properties": {
                "client_id": {"type": "integer"},
                "amount": {"type": "number"},
                "currency": {"type": "string"},
                "due_date": {"type": "string", "description": "ISO date YYYY-MM-DD"},
                "reference": {"type": "string"},
                "notes": {"type": "string"},
                "status": {"type": "string", "enum": ["pending", "paid", "overdue", "cancelled"]},
            },
            "required": ["client_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "update_invoice",
        "description": "Update an invoice (status, amount, due date, notes). Setting status to paid records paid_at.",
        "mutating": True,
        "assistant": False,
        "parameters": {
            "type": "object",
            "properties": {
                "invoice_id": {"type": "integer"},
                "status": {"type": "string", "enum": ["pending", "paid", "overdue", "cancelled"]},
                "amount": {"type": "number"},
                "due_date": {"type": "string", "description": "ISO date YYYY-MM-DD"},
                "notes": {"type": "string"},
            },
            "required": ["invoice_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "create_flat_training_plan",
        "description": "Create a training plan with a flat exercise list (legacy_line rows only).",
        "mutating": True,
        "assistant": False,
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "description": {"type": "string"},
                "venue_type": {"type": "string", "enum": ["home", "commercial_gym", "mixed"]},
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "exercise_id": {"type": "integer"},
                            "sort_order": {"type": "integer"},
                            "sets": {"type": "integer"},
                            "reps": {"type": "integer"},
                            "duration_sec": {"type": "integer"},
                            "rest_sec": {"type": "integer"},
                            "notes": {"type": "string"},
                        },
                        "required": ["exercise_id"],
                        "additionalProperties": False,
                    },
                },
            },
            "required": ["name", "items"],
            "additionalProperties": False,
        },
    },
    {
        "name": "list_plan_templates",
        "description": "List membership / plan templates (products) for this coach.",
        "mutating": False,
        "assistant": True,
        "parameters": {
            "type": "object",
            "properties": {
                "active_only": {"type": "boolean", "description": "Default true"},
                "limit": {"type": "integer"},
            },
            "additionalProperties": False,
        },
    },
]


async def _get_client_for_coach(db: AsyncSession, coach_id: int, client_id: int) -> Client | None:
    return (
        await db.execute(select(Client).where(Client.id == client_id, Client.coach_id == coach_id))
    ).scalar_one_or_none()


async def _get_invoice_for_coach(db: AsyncSession, coach_id: int, invoice_id: int) -> Invoice | None:
    return (
        await db.execute(
            select(Invoice)
            .join(Client, Client.id == Invoice.client_id)
            .where(Invoice.id == invoice_id, Client.coach_id == coach_id)
        )
    ).scalar_one_or_none()


async def _tool_create_client(db: AsyncSession, coach: Coach, args: dict[str, Any]) -> dict[str, Any]:
    name = (args.get("name") or "").strip()
    if not name:
        return {"error": "name_required"}
    c = Client(
        coach_id=coach.id,
        name=name,
        email=(args.get("email") or None) or None,
        phone=(args.get("phone") or None) or None,
        notes=(args.get("notes") or None) or None,
        status=(args.get("status") or "active").strip() or "active",
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return {"id": c.id, "name": c.name, "email": c.email, "status": c.status}


async def _tool_update_client(db: AsyncSession, coach: Coach, args: dict[str, Any]) -> dict[str, Any]:
    cid = int(args["client_id"])
    c = await _get_client_for_coach(db, coach.id, cid)
    if not c:
        return {"error": "client_not_found"}
    for field in ("name", "email", "phone", "notes", "status", "account_status", "goal"):
        if field in args and args[field] is not None:
            val = args[field]
            if isinstance(val, str):
                val = val.strip()
            setattr(c, field, val or None)
    await db.commit()
    await db.refresh(c)
    return {"id": c.id, "name": c.name, "email": c.email, "status": c.status, "account_status": c.account_status}


async def _parse_date(raw: Any) -> date | None:
    if raw is None or raw == "":
        return None
    if isinstance(raw, date):
        return raw
    s = str(raw).strip()
    if not s:
        return None
    return date.fromisoformat(s[:10])


async def _tool_create_invoice(db: AsyncSession, coach: Coach, args: dict[str, Any]) -> dict[str, Any]:
    cid = int(args["client_id"])
    c = await _get_client_for_coach(db, coach.id, cid)
    if not c:
        return {"error": "client_not_found"}
    ref = args.get("reference")
    if ref is None or (isinstance(ref, str) and not ref.strip()):
        ref = await allocate_next_reference(db, coach.id)
    amount = args.get("amount")
    inv = Invoice(
        client_id=cid,
        reference=ref,
        amount=Decimal(str(amount)) if amount is not None else None,
        currency=(args.get("currency") or "USD").strip() or "USD",
        due_date=await _parse_date(args.get("due_date")),
        status=(args.get("status") or "pending").strip() or "pending",
        notes=(args.get("notes") or None) or None,
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)
    emit_invoice_event("invoice_created", {"invoice_id": inv.id, "client_id": inv.client_id, "source": "mcp"})
    return {
        "id": inv.id,
        "reference": inv.reference,
        "client_id": inv.client_id,
        "amount": float(inv.amount) if inv.amount is not None else None,
        "status": inv.status,
        "due_date": inv.due_date.isoformat() if inv.due_date else None,
    }


async def _tool_update_invoice(db: AsyncSession, coach: Coach, args: dict[str, Any]) -> dict[str, Any]:
    iid = int(args["invoice_id"])
    inv = await _get_invoice_for_coach(db, coach.id, iid)
    if not inv:
        return {"error": "invoice_not_found"}
    if "status" in args and args["status"] is not None:
        inv.status = str(args["status"]).strip()
    if "amount" in args and args["amount"] is not None:
        inv.amount = Decimal(str(args["amount"]))
    if "due_date" in args:
        inv.due_date = await _parse_date(args["due_date"])
    if "notes" in args:
        inv.notes = (args.get("notes") or None) or None
    if inv.status == "paid" and inv.paid_at is None:
        inv.paid_at = mark_paid_timestamp()
        emit_invoice_event("invoice_marked_paid", {"invoice_id": inv.id, "client_id": inv.client_id})
    await db.commit()
    await db.refresh(inv)
    return {
        "id": inv.id,
        "reference": inv.reference,
        "status": inv.status,
        "amount": float(inv.amount) if inv.amount is not None else None,
        "due_date": inv.due_date.isoformat() if inv.due_date else None,
    }


async def _tool_create_flat_training_plan(db: AsyncSession, coach: Coach, args: dict[str, Any]) -> dict[str, Any]:
    name = (args.get("name") or "").strip()
    items_in = args.get("items") or []
    if not name:
        return {"error": "name_required"}
    if not items_in:
        return {"error": "items_required"}
    venue = (args.get("venue_type") or "mixed").strip() or "mixed"
    if venue not in ("home", "commercial_gym", "mixed"):
        venue = "mixed"
    plan = TrainingPlan(
        coach_id=coach.id,
        name=name,
        description=(args.get("description") or None) or None,
        venue_type=venue,
    )
    db.add(plan)
    await db.flush()
    for idx, row in enumerate(items_in):
        if not isinstance(row, dict):
            continue
        eid = int(row["exercise_id"])
        db.add(
            TrainingPlanItem(
                training_plan_id=plan.id,
                exercise_id=eid,
                sort_order=int(row.get("sort_order") if row.get("sort_order") is not None else idx),
                sets=row.get("sets"),
                reps=row.get("reps"),
                duration_sec=row.get("duration_sec"),
                rest_sec=row.get("rest_sec"),
                notes=(row.get("notes") or None) or None,
                row_type="legacy_line",
            )
        )
    await db.commit()
    await db.refresh(plan)
    return {"training_plan_id": plan.id, "name": plan.name, "item_count": len(items_in)}


async def _tool_list_plan_templates(db: AsyncSession, coach: Coach, args: dict[str, Any]) -> dict[str, Any]:
    limit = min(max(int(args.get("limit") or 30), 1), 60)
    active_only = args.get("active_only")
    if active_only is None:
        active_only = True
    cond = [PlanTemplate.coach_id == coach.id]
    if active_only:
        cond.append(PlanTemplate.is_active.is_(True))
    rows = (
        await db.execute(
            select(PlanTemplate).where(*cond).order_by(PlanTemplate.sort_order, PlanTemplate.name).limit(limit)
        )
    ).scalars().all()
    return {
        "items": [
            {
                "id": pt.id,
                "name": pt.name,
                "duration_days": pt.duration_days,
                "price": float(pt.price) if pt.price is not None else None,
                "discount_price": float(pt.discount_price) if pt.discount_price is not None else None,
                "currency": pt.currency,
                "is_active": pt.is_active,
            }
            for pt in rows
        ]
    }


_MCP_WRITE_META = {d["name"]: d for d in MCP_WRITE_TOOL_DEFINITIONS}

_MCP_WRITE_DISPATCH = {
    "create_client": _tool_create_client,
    "update_client": _tool_update_client,
    "create_invoice": _tool_create_invoice,
    "update_invoice": _tool_update_invoice,
    "create_flat_training_plan": _tool_create_flat_training_plan,
    "list_plan_templates": _tool_list_plan_templates,
}


def _read_tool_meta() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for t in COACH_CHAT_TOOLS:
        fn = t["function"]
        out.append(
            {
                "name": fn["name"],
                "description": fn["description"],
                "parameters": fn.get("parameters") or {"type": "object", "properties": {}},
                "mutating": False,
                "assistant": True,
            }
        )
    return out


def list_mcp_tools() -> list[dict[str, Any]]:
    """All tools exposed to MCP (read + write)."""
    seen = {d["name"] for d in MCP_WRITE_TOOL_DEFINITIONS}
    read = [t for t in _read_tool_meta() if t["name"] not in seen]
    write = [{k: v for k, v in d.items()} for d in MCP_WRITE_TOOL_DEFINITIONS]
    return read + write


def list_assistant_tools() -> list[dict[str, Any]]:
    """OpenAI function-calling tools for in-app assistant (read-only + safe extras)."""
    base = [t for t in COACH_CHAT_TOOLS]
    extra_names = {t["function"]["name"] for t in base}
    for d in MCP_WRITE_TOOL_DEFINITIONS:
        if d.get("assistant") and d["name"] not in extra_names:
            base.append(
                {
                    "type": "function",
                    "function": {
                        "name": d["name"],
                        "description": d["description"],
                        "parameters": d["parameters"],
                    },
                }
            )
    return base


async def invoke_coach_tool(
    db: AsyncSession,
    coach: Coach,
    name: str,
    args: dict[str, Any] | None,
    *,
    allow_mutating: bool = False,
) -> dict[str, Any]:
    payload = args if isinstance(args, dict) else {}
    fn = _READ_DISPATCH.get(name)
    if fn:
        result = await fn(db, coach, payload)
        return _json_safe(result) if isinstance(result, dict) else {"result": _json_safe(result)}
    write_fn = _MCP_WRITE_DISPATCH.get(name)
    if write_fn:
        is_mutating = bool(_MCP_WRITE_META.get(name, {}).get("mutating"))
        if is_mutating and not allow_mutating:
            return {"error": "mutating_tool_not_allowed", "name": name}
        result = await write_fn(db, coach, payload)
        return _json_safe(result) if isinstance(result, dict) else {"result": _json_safe(result)}
    return {"error": "unknown_tool", "name": name}
