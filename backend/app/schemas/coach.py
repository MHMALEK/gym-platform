import re

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ORMBase
from app.schemas.dashboard import DashboardSummary

_HEX_COLOR = re.compile(r"^#[0-9A-Fa-f]{6}$")


class CoachRead(ORMBase):
    id: int
    email: str
    name: str
    firebase_uid: str
    tagline: str | None = None
    primary_color: str | None = None
    logo_media_asset_id: int | None = None
    logo_url: str | None = None
    insights: DashboardSummary | None = None


class CoachUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    tagline: str | None = Field(None, max_length=500)
    primary_color: str | None = Field(None, max_length=16)
    logo_media_asset_id: int | None = None

    @field_validator("tagline", mode="before")
    @classmethod
    def empty_tagline_to_none(cls, v: str | None) -> str | None:
        if v is not None and isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("primary_color", mode="before")
    @classmethod
    def normalize_color(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        if not _HEX_COLOR.match(s):
            raise ValueError("primary_color must be a #RRGGBB hex color")
        return s


class CoachBootstrapResponse(ORMBase):
    id: int
    email: str
    name: str
    firebase_uid: str
    created: bool


class DeviceTokenCreate(BaseModel):
    token: str
    platform: str | None = None


class DeviceTokenRead(ORMBase):
    id: int
    token: str
    platform: str | None
