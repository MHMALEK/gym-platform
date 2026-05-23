from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentCoach, DbSession
from app.schemas.coach_site import CoachSiteCoachRead, CoachSiteContent, CoachSiteUpdate
from app.services.coach_site import (
    ensure_unique_slug,
    merge_site_update,
    parse_site_content,
    slugify_name,
)

router = APIRouter(prefix="/me/site", tags=["me"])


@router.get("", response_model=CoachSiteCoachRead)
async def read_my_site(coach: CurrentCoach, db: DbSession):
    content = parse_site_content(coach.site_content, coach=coach)
    preview = f"/c/{coach.public_slug}" if coach.public_slug else None
    return CoachSiteCoachRead(
        public_slug=coach.public_slug,
        site_published=bool(coach.site_published),
        content=content,
        preview_path=preview,
    )


@router.patch("", response_model=CoachSiteCoachRead)
async def update_my_site(coach: CurrentCoach, db: DbSession, body: CoachSiteUpdate):
    data = body.model_dump(exclude_unset=True)
    if "public_slug" in data:
        slug = data["public_slug"]
        if slug is None:
            coach.public_slug = None
        else:
            taken = await ensure_unique_slug(db, slug, exclude_coach_id=coach.id)
            coach.public_slug = taken
    if "site_published" in data and data["site_published"] is not None:
        if data["site_published"] and not coach.public_slug:
            base = slugify_name(coach.name)
            coach.public_slug = await ensure_unique_slug(db, base, exclude_coach_id=coach.id)
        coach.site_published = bool(data["site_published"])
    if "content" in data and data["content"] is not None:
        raw_content = data["content"]
        content = (
            raw_content
            if isinstance(raw_content, CoachSiteContent)
            else CoachSiteContent.model_validate(raw_content)
        )
        merge_site_update(coach, content)
    await db.commit()
    await db.refresh(coach)
    content = parse_site_content(coach.site_content, coach=coach)
    preview = f"/c/{coach.public_slug}" if coach.public_slug else None
    return CoachSiteCoachRead(
        public_slug=coach.public_slug,
        site_published=bool(coach.site_published),
        content=content,
        preview_path=preview,
    )
