"""Coach public microsite content (JSON on Coach row)."""

from __future__ import annotations

import json
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.coach import Coach
from app.schemas.coach_site import CoachSiteContent, CoachSiteServiceBlock

_SLUG_FROM_NAME = re.compile(r"[^a-z0-9]+")


def default_site_content(*, coach_name: str, tagline: str | None, email: str) -> CoachSiteContent:
    name = coach_name.strip() or "Coach"
    tag = (tagline or "").strip()
    return CoachSiteContent(
        hero={
            "headline": name,
            "subheadline": tag or f"Personal training and nutrition coaching with {name}.",
            "cta_label": "Become a client",
            "hero_image_url": None,
        },
        about={
            "title": "About me",
            "body": (
                f"I help clients train smarter, eat better, and stay consistent. "
                f"Work with me for structured programs and direct support."
            ),
            "image_url": None,
        },
        services=[
            CoachSiteServiceBlock(
                title="1:1 coaching",
                description="Custom training and nutrition with ongoing check-ins and adjustments.",
            ),
            CoachSiteServiceBlock(
                title="Training programs",
                description="Structured workouts tailored to your goals, schedule, and equipment.",
            ),
            CoachSiteServiceBlock(
                title="Accountability",
                description="Messaging, progress tracking, and reminders so you stay on plan.",
            ),
        ],
        contact={"email": email, "phone": "", "instagram": "", "whatsapp": ""},
    )


def slugify_name(name: str) -> str:
    base = _SLUG_FROM_NAME.sub("-", name.strip().lower()).strip("-")
    if len(base) < 3:
        base = "coach"
    return base[:48]


async def ensure_unique_slug(db: AsyncSession, base: str, *, exclude_coach_id: int | None = None) -> str:
    candidate = base[:64]
    n = 0
    while True:
        slug = candidate if n == 0 else f"{candidate[:58]}-{n}"
        stmt = select(Coach.id).where(Coach.public_slug == slug)
        if exclude_coach_id is not None:
            stmt = stmt.where(Coach.id != exclude_coach_id)
        taken = (await db.execute(stmt)).scalar_one_or_none()
        if taken is None:
            return slug
        n += 1


def parse_site_content(raw: str | None, *, coach: Coach) -> CoachSiteContent:
    if not raw or not raw.strip():
        return default_site_content(coach_name=coach.name, tagline=coach.tagline, email=coach.email)
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return CoachSiteContent.model_validate(data)
    except (json.JSONDecodeError, ValueError):
        pass
    return default_site_content(coach_name=coach.name, tagline=coach.tagline, email=coach.email)


def serialize_site_content(content: CoachSiteContent) -> str:
    return json.dumps(content.model_dump(), ensure_ascii=False)


def merge_site_update(coach: Coach, content: CoachSiteContent) -> None:
    coach.site_content = serialize_site_content(content)
