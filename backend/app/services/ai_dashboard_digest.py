from __future__ import annotations

import json
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.plan_template import PlanTemplate
from app.schemas.dashboard import AIDashboardDigest, AIDigestAction, AIDigestItem, DashboardSummary


def _json_safe(obj: Any) -> Any:
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, date):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_json_safe(v) for v in obj]
    return obj


def _fallback_digest(summary: DashboardSummary) -> AIDashboardDigest:
    priority_items: list[AIDigestItem] = []
    watch_items: list[AIDigestItem] = []
    if summary.invoices_overdue > 0:
        priority_items.append(
            AIDigestItem(
                title=f"{summary.invoices_overdue} overdue invoice(s)",
                reason="Overdue invoices may delay cash flow and client continuity.",
                severity="high",
                action=AIDigestAction(label="Review invoices", path="/invoices"),
            )
        )
    if summary.invoices_pending > 0:
        watch_items.append(
            AIDigestItem(
                title=f"{summary.invoices_pending} open invoice(s)",
                reason="Follow up pending payments before they become overdue.",
                severity="medium",
                action=AIDigestAction(label="Open invoices", path="/invoices"),
            )
        )
    if summary.clients_inactive > 0:
        watch_items.append(
            AIDigestItem(
                title=f"{summary.clients_inactive} inactive client(s)",
                reason="Re-engage paused clients to improve retention.",
                severity="medium",
                action=AIDigestAction(label="Open clients", path="/clients"),
            )
        )
    if summary.finance_due_soon:
        watch_items.append(
            AIDigestItem(
                title=f"{len(summary.finance_due_soon)} invoice(s) due in 7 days",
                reason="Prepare reminders now to reduce overdue risk.",
                severity="low",
                action=AIDigestAction(label="View due soon", path="/invoices"),
            )
        )

    return AIDashboardDigest(
        generated_at=datetime.now(tz=UTC).isoformat(),
        headline="Coach digest ready",
        summary="Manual digest generated from your latest business signals.",
        priority_items=priority_items[:5],
        watch_items=watch_items[:5],
        model_used="fallback",
    )


async def _build_digest_context(
    db: AsyncSession, coach_id: int, summary: DashboardSummary
) -> dict[str, Any]:
    today = date.today()
    recent_clients = (
        await db.execute(
            select(Client)
            .where(Client.coach_id == coach_id)
            .order_by(Client.updated_at.desc())
            .limit(8)
        )
    ).scalars()
    upcoming_cutoff = today + timedelta(days=14)
    upcoming_invoices = (
        await db.execute(
            select(Invoice)
            .join(Client, Client.id == Invoice.client_id)
            .where(Client.coach_id == coach_id, Invoice.status == "pending")
            .where(Invoice.due_date.is_not(None), Invoice.due_date <= upcoming_cutoff)
            .order_by(Invoice.due_date.asc())
            .limit(8)
        )
    ).scalars()
    plan_templates = (
        await db.execute(
            select(PlanTemplate).where(PlanTemplate.coach_id == coach_id).order_by(PlanTemplate.updated_at.desc()).limit(5)
        )
    ).scalars()

    return {
        "dashboard_summary": summary.model_dump(),
        "recent_clients": [
            {
                "id": c.id,
                "name": c.name,
                "status": c.status,
                "account_status": c.account_status,
                "billing_preference": c.billing_preference,
            }
            for c in recent_clients
        ],
        "upcoming_invoices": [
            {
                "id": inv.id,
                "client_id": inv.client_id,
                "reference": inv.reference,
                "amount": inv.amount,
                "currency": inv.currency,
                "due_date": inv.due_date,
                "status": inv.status,
            }
            for inv in upcoming_invoices
        ],
        "membership_products": [
            {"id": p.id, "name": p.name, "active": p.is_active, "duration_days": p.duration_days}
            for p in plan_templates
        ],
    }


def _parse_response(raw: str) -> AIDashboardDigest | None:
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return None
    try:
        return AIDashboardDigest.model_validate(payload)
    except Exception:
        return None


async def generate_coach_dashboard_digest(
    db: AsyncSession,
    *,
    coach_id: int,
    summary: DashboardSummary,
) -> AIDashboardDigest:
    if not settings.openai_api_key or not settings.openai_api_key.strip():
        return _fallback_digest(summary)

    context = _json_safe(await _build_digest_context(db, coach_id, summary))
    system = "\n".join(
        [
            "You generate a concise coach operations digest.",
            "Prioritize actions with business impact (overdue invoices, churn risk, payment risks, inactive clients).",
            "Output JSON only with fields:",
            "generated_at (ISO datetime), headline, summary, priority_items, watch_items, model_used.",
            "Each item shape: title, reason, severity (high|medium|low), action (label, path) or null.",
            "Prefer app paths like /clients, /invoices, /dashboard.",
            "Keep items practical and specific; max 5 priority and 5 watch items.",
        ]
    )
    user = json.dumps(context, ensure_ascii=False)
    client = AsyncOpenAI(
        api_key=settings.openai_api_key.strip(),
        base_url=settings.openai_base_url.strip() if settings.openai_base_url else None,
    )
    try:
        completion = await client.chat.completions.create(
            model=settings.openai_chat_model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=1200,
        )
    except Exception:
        return _fallback_digest(summary)

    raw = completion.choices[0].message.content or ""
    parsed = _parse_response(raw)
    if parsed is None:
        return _fallback_digest(summary)

    if not parsed.generated_at:
        parsed.generated_at = datetime.now(tz=UTC).isoformat()
    if not parsed.model_used:
        parsed.model_used = settings.openai_chat_model
    return parsed
