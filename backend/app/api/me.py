import logging

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import delete, select

from app.api.deps import CurrentCoach, DbSession
from app.core.config import settings
from app.core.security import init_firebase
from app.models.coach_device_token import CoachDeviceToken
from app.api.dashboard import build_dashboard_summary
from app.schemas.coach import CoachRead, DeviceTokenCreate, DeviceTokenRead
from app.schemas.common import Message

router = APIRouter(prefix="/me", tags=["me"])
logger = logging.getLogger(__name__)


@router.get("", response_model=CoachRead)
async def read_me(
    coach: CurrentCoach,
    db: DbSession,
    insights: bool = Query(False, description="Include dashboard metrics on the home screen"),
):
    base = CoachRead.model_validate(coach, from_attributes=True)
    if not insights:
        return base
    summary = await build_dashboard_summary(coach, db)
    return base.model_copy(update={"insights": summary})


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
