"""Aggregate coach follow-up signals for the AI assistant."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.client_coaching_plan import ClientCoachingPlan
from app.models.client_subscription import ClientSubscription
from app.models.invoice import Invoice
from app.services.client_chat import get_coach_message_inbox_summary

_REASON_PRIORITY = {
    "overdue_invoice": 0,
    "message_awaiting_reply": 1,
    "invoice_due_soon": 2,
    "membership_expiring": 3,
    "no_training_plan": 4,
    "inactive_status": 5,
}


def _priority_rank(reasons: list[dict[str, Any]]) -> int:
    if not reasons:
        return 99
    return min(_REASON_PRIORITY.get(r.get("type", ""), 50) for r in reasons)


async def get_coach_follow_up_candidates(
    db: AsyncSession,
    *,
    coach_id: int,
    limit: int = 25,
) -> dict[str, Any]:
    """Clients who likely need coach attention (messages, billing, plans, status)."""
    limit = min(max(limit, 1), 40)
    today = date.today()
    week_end = today + timedelta(days=7)
    membership_cutoff = today + timedelta(days=14)
    today_start = datetime.combine(today, datetime.min.time())
    membership_cutoff_end = datetime.combine(membership_cutoff, datetime.max.time())

    overdue_cond = or_(
        Invoice.status == "overdue",
        (Invoice.status == "pending") & (Invoice.due_date.isnot(None)) & (Invoice.due_date < today),
    )

    by_client: dict[int, dict[str, Any]] = {}

    def touch(client_id: int, client_name: str) -> dict[str, Any]:
        if client_id not in by_client:
            by_client[client_id] = {
                "client_id": client_id,
                "client_name": client_name,
                "reasons": [],
            }
        return by_client[client_id]

    def add_reason(client_id: int, client_name: str, reason: dict[str, Any]) -> None:
        row = touch(client_id, client_name)
        existing_types = {r.get("type") for r in row["reasons"]}
        if reason.get("type") not in existing_types:
            row["reasons"].append(reason)

    inbox = await get_coach_message_inbox_summary(db, coach_id=coach_id, limit=40)
    for item in inbox.get("awaiting_reply") or []:
        add_reason(
            int(item["client_id"]),
            str(item.get("client_name") or ""),
            {
                "type": "message_awaiting_reply",
                "preview": item.get("preview"),
                "last_message_at": item.get("last_message_at"),
            },
        )

    overdue_rows = (
        await db.execute(
            select(Invoice, Client.name)
            .join(Client, Client.id == Invoice.client_id)
            .where(Client.coach_id == coach_id)
            .where(overdue_cond)
            .order_by(Invoice.due_date.asc().nullslast())
            .limit(40)
        )
    ).all()
    for inv, cname in overdue_rows:
        days_overdue = (today - inv.due_date).days if inv.due_date else None
        add_reason(
            inv.client_id,
            cname,
            {
                "type": "overdue_invoice",
                "invoice_id": inv.id,
                "reference": inv.reference,
                "amount": float(inv.amount) if inv.amount is not None else None,
                "currency": inv.currency,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "days_overdue": days_overdue,
            },
        )

    due_soon_rows = (
        await db.execute(
            select(Invoice, Client.name)
            .join(Client, Client.id == Invoice.client_id)
            .where(Client.coach_id == coach_id)
            .where(Invoice.status == "pending")
            .where(Invoice.due_date.isnot(None))
            .where(Invoice.due_date >= today)
            .where(Invoice.due_date <= week_end)
            .order_by(Invoice.due_date.asc())
            .limit(40)
        )
    ).all()
    for inv, cname in due_soon_rows:
        days_until = (inv.due_date - today).days if inv.due_date else None
        add_reason(
            inv.client_id,
            cname,
            {
                "type": "invoice_due_soon",
                "invoice_id": inv.id,
                "reference": inv.reference,
                "amount": float(inv.amount) if inv.amount is not None else None,
                "currency": inv.currency,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "days_until_due": days_until,
            },
        )

    no_plan_rows = (
        await db.execute(
            select(Client)
            .outerjoin(ClientCoachingPlan, ClientCoachingPlan.client_id == Client.id)
            .where(Client.coach_id == coach_id, Client.status == "active")
            .where(
                or_(
                    ClientCoachingPlan.id.is_(None),
                    ClientCoachingPlan.assigned_training_plan_id.is_(None),
                )
            )
            .order_by(Client.name)
            .limit(40)
        )
    ).scalars()
    for client in no_plan_rows:
        add_reason(
            client.id,
            client.name,
            {"type": "no_training_plan", "detail": "Active client without an assigned training plan."},
        )

    inactive_rows = (
        await db.execute(
            select(Client)
            .where(Client.coach_id == coach_id, Client.status == "inactive")
            .order_by(Client.name)
            .limit(40)
        )
    ).scalars()
    for client in inactive_rows:
        add_reason(
            client.id,
            client.name,
            {"type": "inactive_status", "detail": "Client marked inactive — consider re-engaging."},
        )

    expiring_rows = (
        await db.execute(
            select(ClientSubscription, Client.name)
            .join(Client, Client.id == ClientSubscription.client_id)
            .where(Client.coach_id == coach_id, ClientSubscription.status == "active")
            .where(ClientSubscription.ends_at.isnot(None))
            .where(ClientSubscription.ends_at >= today_start)
            .where(ClientSubscription.ends_at <= membership_cutoff_end)
            .order_by(ClientSubscription.ends_at.asc())
            .limit(40)
        )
    ).all()
    for sub, cname in expiring_rows:
        ends = sub.ends_at.date() if sub.ends_at else None
        days_left = (ends - today).days if ends else None
        add_reason(
            sub.client_id,
            cname,
            {
                "type": "membership_expiring",
                "subscription_id": sub.id,
                "ends_at": ends.isoformat() if ends else None,
                "days_until_end": days_left,
            },
        )

    candidates = list(by_client.values())
    candidates.sort(key=lambda c: (_priority_rank(c["reasons"]), str(c.get("client_name") or "").lower()))

    return {
        "total_candidates": len(candidates),
        "candidates": candidates[:limit],
        "signals_checked": [
            "message_awaiting_reply",
            "overdue_invoice",
            "invoice_due_soon",
            "no_training_plan",
            "inactive_status",
            "membership_expiring",
        ],
        "_note": (
            "Each client may have multiple reasons. Use this tool for follow-up, who needs attention, "
            "check-in, or roster priority questions."
        ),
    }
