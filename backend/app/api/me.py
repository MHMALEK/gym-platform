import logging

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import delete, select

from app.api.deps import CurrentCoach, DbSession
from app.core.config import settings
from app.core.media_util import build_public_url
from app.core.security import init_firebase
from app.models.coach import Coach
from app.models.coach_device_token import CoachDeviceToken
from app.models.media_asset import MediaAsset
from app.api.dashboard import build_dashboard_summary
from app.schemas.coach import CoachRead, CoachUpdate, DeviceTokenCreate, DeviceTokenRead
from app.schemas.common import Message
from app.schemas.dashboard import DashboardSummary
from app.services.media_orphans import delete_asset_if_unreferenced

router = APIRouter(prefix="/me", tags=["me"])
logger = logging.getLogger(__name__)


async def _coach_read(db: DbSession, coach: Coach, insights: DashboardSummary | None = None) -> CoachRead:
    logo_url = None
    if coach.logo_media_asset_id:
        res = await db.execute(select(MediaAsset).where(MediaAsset.id == coach.logo_media_asset_id))
        asset = res.scalar_one_or_none()
        if asset:
            logo_url = build_public_url(asset.storage_path)
    base = CoachRead.model_validate(coach, from_attributes=True)
    return base.model_copy(update={"logo_url": logo_url, "insights": insights})


@router.get("", response_model=CoachRead)
async def read_me(
    coach: CurrentCoach,
    db: DbSession,
    insights: bool = Query(False, description="Include dashboard metrics on the home screen"),
):
    summary = None
    if insights:
        summary = await build_dashboard_summary(coach, db)
    return await _coach_read(db, coach, summary)


@router.patch("", response_model=CoachRead)
async def update_me(coach: CurrentCoach, db: DbSession, body: CoachUpdate):
    old_logo_id = coach.logo_media_asset_id
    data = body.model_dump(exclude_unset=True)
    if "logo_media_asset_id" in data:
        new_id = data.pop("logo_media_asset_id")
        if new_id is not None:
            res = await db.execute(
                select(MediaAsset).where(MediaAsset.id == new_id, MediaAsset.coach_id == coach.id)
            )
            if res.scalar_one_or_none() is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="logo_media_asset_id does not belong to this coach",
                )
        coach.logo_media_asset_id = new_id
    for key, value in data.items():
        setattr(coach, key, value)
    await db.commit()
    await db.refresh(coach)
    if old_logo_id and old_logo_id != coach.logo_media_asset_id:
        await delete_asset_if_unreferenced(db, old_logo_id)
        await db.commit()
    return await _coach_read(db, coach)


@router.post("/device-tokens", response_model=DeviceTokenRead, status_code=status.HTTP_201_CREATED)
async def register_device_token(
    body: DeviceTokenCreate,
    coach: CurrentCoach,
    db: DbSession,
):
    result = await db.execute(
        select(CoachDeviceToken).where(
            CoachDeviceToken.coach_id == coach.id,
            CoachDeviceToken.token == body.token,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.platform = body.platform
        await db.commit()
        await db.refresh(existing)
        return existing
    row = CoachDeviceToken(coach_id=coach.id, token=body.token, platform=body.platform)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/device-tokens/{token:path}", response_model=Message)
async def remove_device_token(
    token: str,
    coach: CurrentCoach,
    db: DbSession,
):
    await db.execute(
        delete(CoachDeviceToken).where(
            CoachDeviceToken.coach_id == coach.id,
            CoachDeviceToken.token == token,
        )
    )
    await db.commit()
    return Message(message="removed")


@router.post("/notifications/test", response_model=Message)
async def send_test_notification(coach: CurrentCoach, db: DbSession):
    if settings.dev_bypass_auth:
        return Message(message="FCM test skipped (dev_bypass_auth)")
    init_firebase()
    try:
        from firebase_admin import messaging
    except Exception:
        return Message(message="Firebase messaging not available")

    result = await db.execute(
        select(CoachDeviceToken).where(CoachDeviceToken.coach_id == coach.id)
    )
    tokens = [r.token for r in result.scalars().all()]
    if not tokens:
        raise HTTPException(status_code=400, detail="No device tokens registered")
    sent = 0
    for t in tokens:
        try:
            messaging.send(
                messaging.Message(
                    token=t,
                    notification=messaging.Notification(
                        title="Gym Coach",
                        body="Test notification",
                    ),
                )
            )
            sent += 1
        except Exception as e:
            logger.warning("FCM send failed for token …: %s", e)
    return Message(message=f"sent to {sent} device(s)")
