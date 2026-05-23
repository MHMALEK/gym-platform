import re

from pydantic import BaseModel, Field, field_validator

_SLUG = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$")


class CoachSiteServiceBlock(BaseModel):
    title: str = Field(default="", max_length=120)
    description: str = Field(default="", max_length=600)


class CoachSiteHero(BaseModel):
    headline: str = Field(default="", max_length=200)
    subheadline: str = Field(default="", max_length=500)
    cta_label: str = Field(default="Join as a client", max_length=80)
    hero_image_url: str | None = Field(default=None, max_length=2048)


class CoachSiteAbout(BaseModel):
    title: str = Field(default="About me", max_length=120)
    body: str = Field(default="", max_length=4000)
    image_url: str | None = Field(default=None, max_length=2048)


class CoachSiteContact(BaseModel):
    email: str = Field(default="", max_length=255)
    phone: str = Field(default="", max_length=64)
    instagram: str = Field(default="", max_length=120)
    whatsapp: str = Field(default="", max_length=64)


class CoachSiteContent(BaseModel):
    hero: CoachSiteHero = Field(default_factory=CoachSiteHero)
    about: CoachSiteAbout = Field(default_factory=CoachSiteAbout)
    services: list[CoachSiteServiceBlock] = Field(default_factory=list)
    contact: CoachSiteContact = Field(default_factory=CoachSiteContact)


class CoachSiteUpdate(BaseModel):
    public_slug: str | None = Field(None, min_length=3, max_length=64)
    site_published: bool | None = None
    content: CoachSiteContent | None = None

    @field_validator("public_slug", mode="before")
    @classmethod
    def normalize_slug(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip().lower()
        if not s:
            return None
        if not _SLUG.match(s):
            raise ValueError("public_slug must be lowercase letters, numbers, and hyphens (3–64 chars)")
        return s


class CoachSiteCoachRead(BaseModel):
    public_slug: str | None = None
    site_published: bool = False
    content: CoachSiteContent
    preview_path: str | None = None


class CoachPublicSiteRead(BaseModel):
    slug: str
    name: str
    tagline: str | None = None
    primary_color: str | None = None
    logo_url: str | None = None
    invite_code: str
    content: CoachSiteContent
