import mimetypes

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.api.deps import CurrentCoach, DbSession
from app.core.config import settings
from app.core.media_util import (
    absolute_upload_path,
    build_public_url,
    build_storage_rel_path,
    content_type_allowed,
    safe_filename_stem,
)
from app.models.media_asset import MediaAsset
from app.schemas.media import MediaAssetRead, MediaRegister, is_safe_public_url

router = APIRouter(prefix="/media", tags=["media"])


def serialize_media_asset(a: MediaAsset) -> MediaAssetRead:
    return MediaAssetRead(
        id=a.id,
        coach_id=a.coach_id,
        storage_provider=a.storage_provider,
        storage_path=a.storage_path,
        content_type=a.content_type,
        byte_size=a.byte_size,
        original_filename=a.original_filename,
        public_url=build_public_url(a.storage_path),
    )


@router.post("/upload", response_model=MediaAssetRead, status_code=201)
async def upload_media(
    coach: CurrentCoach,
    db: DbSession,
    file: UploadFile = File(...),
):
    raw_ct = (file.content_type or "").split(";")[0].strip().lower()
    if not content_type_allowed(raw_ct):
        guessed, _ = mimetypes.guess_type(file.filename or "")
        g = (guessed or "").lower()
        if content_type_allowed(g):
            raw_ct = g
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")

    rel_path = build_storage_rel_path(coach.id, raw_ct)
    dest = absolute_upload_path(rel_path)
    dest.parent.mkdir(parents=True, exist_ok=True)

    size = 0
    try:
        with dest.open("wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > settings.media_max_upload_bytes:
                    dest.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail="File too large")
                out.write(chunk)
    finally:
        await file.close()

    asset = MediaAsset(
        coach_id=coach.id,
        storage_provider="local",
        storage_path=rel_path,
        content_type=raw_ct,
        byte_size=size,
        original_filename=safe_filename_stem(file.filename),
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return serialize_media_asset(asset)


@router.post("/register", response_model=MediaAssetRead, status_code=201)
async def register_media(body: MediaRegister, coach: CurrentCoach, db: DbSession):
    if not content_type_allowed(body.content_type):
        raise HTTPException(status_code=400, detail="Unsupported content type")
    url_str = str(body.public_url)
    if len(url_str) > 512:
        raise HTTPException(status_code=400, detail="URL too long")
    if not is_safe_public_url(url_str):
        raise HTTPException(status_code=400, detail="Invalid public URL")

    asset = MediaAsset(
        coach_id=coach.id,
        storage_provider=body.storage_provider,
        storage_path=url_str,
        content_type=body.content_type[:128],
        byte_size=body.byte_size,
        original_filename=body.original_filename,
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return serialize_media_asset(asset)
