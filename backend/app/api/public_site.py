from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import DbSession
from app.core.media_util import build_public_url
from app.models.coach import Coach
from app.models.media_asset import MediaAsset
from app.schemas.coach_site import CoachPublicSiteRead
from app.services.coach_site import parse_site_content
from app.services.invite_codes import ensure_coach_invite_code

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/site/{slug}", response_model=CoachPublicSiteRead)
async def read_public_coach_site(slug: str, db: DbSession):
    normalized = slug.strip().lower()
    if not normalized:
        raise HTTPException(status_code=404, detail="Site not found")
    result = await db.execute(
        select(Coach).where(Coach.public_slug == normalized, Coach.site_published.is_(True))
    )
    coach = result.scalar_one_or_none()
    if not coach:
        raise HTTPException(status_code=404, detail="Site not found")
    await ensure_coach_invite_code(db, coach)
    logo_url = None
    if coach.logo_media_asset_id:
        asset = (await db.execute(select(MediaAsset).where(MediaAsset.id == coach.logo_media_asset_id))).scalar_one_or_none()
        if asset:
            logo_url = build_public_url(asset.storage_path)
    content = parse_site_content(coach.site_content, coach=coach)
    return CoachPublicSiteRead(
        slug=coach.public_slug or normalized,
        name=coach.name,
        tagline=coach.tagline,
        primary_color=coach.primary_color,
        logo_url=logo_url,
        invite_code=coach.invite_code or "",
        content=content,
    )
