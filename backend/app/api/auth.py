from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import DbSession
from app.api.utils import get_firebase_claims
from app.models.client import Client
from app.models.coach import Coach
from app.schemas.auth_session import (
    AuthWhoamiClient,
    AuthWhoamiCoach,
    AuthWhoamiNone,
    ClientBootstrapRequest,
    ClientBootstrapResponse,
    CoachPublicPreview,
)
from app.schemas.coach import CoachBootstrapResponse
from app.services.invite_codes import ensure_coach_invite_code

router = APIRouter(prefix="/auth", tags=["auth"])


def _normalize_invite_code(raw: str | None) -> str | None:
    if raw is None:
        return None
    code = raw.strip().lower()
    return code or None


@router.get("/whoami")
async def whoami(
    db: DbSession,
    claims: dict = Depends(get_firebase_claims),
):
    uid = claims["uid"]
    coach_result = await db.execute(select(Coach).where(Coach.firebase_uid == uid))
    coach = coach_result.scalar_one_or_none()
    if coach:
        return AuthWhoamiCoach(id=coach.id, name=coach.name, email=coach.email)
    client_result = await db.execute(
        select(Client, Coach.name)
        .join(Coach, Client.coach_id == Coach.id)
        .where(Client.firebase_uid == uid)
    )
    row = client_result.one_or_none()
    if row:
        client, coach_name = row
        return AuthWhoamiClient(
            id=client.id,
            name=client.name,
            email=client.email,
            coach_id=client.coach_id,
            coach_name=coach_name,
        )
    return AuthWhoamiNone()


@router.get("/coach-preview/{invite_code}", response_model=CoachPublicPreview)
async def coach_preview(invite_code: str, db: DbSession):
    code = _normalize_invite_code(invite_code)
    if not code:
        raise HTTPException(status_code=404, detail="Coach not found")
    result = await db.execute(select(Coach).where(func.lower(Coach.invite_code) == code))
    coach = result.scalar_one_or_none()
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found")
    return CoachPublicPreview(name=coach.name, tagline=coach.tagline, invite_code=coach.invite_code or code)


@router.post("/bootstrap", response_model=CoachBootstrapResponse)
async def bootstrap(
    db: DbSession,
    claims: dict = Depends(get_firebase_claims),
):
    uid = claims["uid"]
    client_result = await db.execute(select(Client).where(Client.firebase_uid == uid))
    if client_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is registered as a client. Use the client portal.",
        )
    result = await db.execute(select(Coach).where(Coach.firebase_uid == uid))
    existing = result.scalar_one_or_none()
    if existing:
        await ensure_coach_invite_code(db, existing)
        await db.commit()
        await db.refresh(existing)
        return CoachBootstrapResponse(
            id=existing.id,
            email=existing.email,
            name=existing.name,
            firebase_uid=existing.firebase_uid,
            created=False,
        )
    coach = Coach(
        firebase_uid=uid,
        email=claims.get("email") or "",
        name=claims.get("name") or claims.get("email") or "Coach",
    )
    db.add(coach)
    await db.flush()
    await ensure_coach_invite_code(db, coach)
    await db.commit()
    await db.refresh(coach)
    return CoachBootstrapResponse(
        id=coach.id,
        email=coach.email,
        name=coach.name,
        firebase_uid=coach.firebase_uid,
        created=True,
    )


@router.post("/client/bootstrap", response_model=ClientBootstrapResponse)
async def client_bootstrap(
    body: ClientBootstrapRequest,
    db: DbSession,
    claims: dict = Depends(get_firebase_claims),
):
    uid = claims["uid"]
    email = (claims.get("email") or "").strip().lower() or None
    display_name = (body.name or claims.get("name") or claims.get("email") or "Client").strip()

    coach_result = await db.execute(select(Coach).where(Coach.firebase_uid == uid))
    if coach_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is registered as a coach.",
        )

    existing_result = await db.execute(
        select(Client, Coach.name)
        .join(Coach, Client.coach_id == Coach.id)
        .where(Client.firebase_uid == uid)
    )
    existing_row = existing_result.one_or_none()
    if existing_row:
        client, coach_name = existing_row
        return ClientBootstrapResponse(
            id=client.id,
            coach_id=client.coach_id,
            name=client.name,
            email=client.email,
            firebase_uid=client.firebase_uid or uid,
            created=False,
            coach_name=coach_name,
        )

    invite_code = _normalize_invite_code(body.invite_code)
    if not invite_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invite_code is required for new client signup",
        )

    coach_lookup = await db.execute(select(Coach).where(func.lower(Coach.invite_code) == invite_code))
    coach = coach_lookup.scalar_one_or_none()
    if not coach:
        raise HTTPException(status_code=404, detail="Invalid coach invite code")

    if email:
        link_result = await db.execute(
            select(Client)
            .where(
                Client.coach_id == coach.id,
                Client.firebase_uid.is_(None),
                func.lower(Client.email) == email,
            )
            .limit(1)
        )
        linkable = link_result.scalar_one_or_none()
        if linkable:
            linkable.firebase_uid = uid
            if not linkable.name.strip():
                linkable.name = display_name
            await db.commit()
            await db.refresh(linkable)
            return ClientBootstrapResponse(
                id=linkable.id,
                coach_id=linkable.coach_id,
                name=linkable.name,
                email=linkable.email,
                firebase_uid=uid,
                created=False,
                coach_name=coach.name,
            )

    client = Client(
        coach_id=coach.id,
        firebase_uid=uid,
        name=display_name,
        email=email,
        status="active",
        account_status="onboarding",
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return ClientBootstrapResponse(
        id=client.id,
        coach_id=client.coach_id,
        name=client.name,
        email=client.email,
        firebase_uid=uid,
        created=True,
        coach_name=coach.name,
    )
