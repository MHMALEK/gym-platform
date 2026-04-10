from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, HttpUrl, field_validator

from app.schemas.common import ORMBase

MediaRole = Literal["gallery", "thumbnail", "primary_video"]
StorageProvider = Literal["local", "firebase", "external", "s3"]


class MediaAssetRead(ORMBase):
    id: int
    coach_id: int
    storage_provider: str
    storage_path: str
    content_type: str
    byte_size: int
    original_filename: str | None
    public_url: str


class MediaRegister(BaseModel):
    """Register metadata after a client-side upload (e.g. Firebase Storage) or external CDN URL."""

    storage_provider: Literal["firebase", "external", "s3"]
    public_url: HttpUrl
    content_type: str = Field(..., max_length=128)
    byte_size: int = Field(0, ge=0)
    original_filename: str | None = Field(None, max_length=255)

    @field_validator("content_type")
    @classmethod
    def content_type_ok(cls, v: str) -> str:
        if not v or len(v) > 128:
            raise ValueError("Invalid content type")
        return v.lower().strip()


class ExerciseMediaLinkCreate(BaseModel):
    media_asset_id: int
    role: MediaRole = "gallery"
    sort_order: int | None = None


class ExerciseMediaLinkPatch(BaseModel):
    role: MediaRole


class ExerciseMediaOrderUpdate(BaseModel):
    """ExerciseMedia row ids in desired display order (first = lowest sort_order)."""

    ordered_link_ids: list[int] = Field(default_factory=list)


class ExerciseMediaItemRead(ORMBase):
    id: int
    exercise_id: int
    media_asset_id: int
    sort_order: int
    role: str
    asset: MediaAssetRead


def is_safe_public_url(url: str) -> bool:
    p = urlparse(url)
    return p.scheme in ("https", "http") and bool(p.netloc)
