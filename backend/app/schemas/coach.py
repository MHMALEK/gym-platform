from pydantic import BaseModel

from app.schemas.common import ORMBase
from app.schemas.dashboard import DashboardSummary


class CoachRead(ORMBase):
    id: int
    email: str
    name: str
    firebase_uid: str
    insights: DashboardSummary | None = None


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
