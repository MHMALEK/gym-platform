from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import ORMBase
from app.schemas.plan_template import PlanTemplateRead


class ClientSubscriptionCreate(BaseModel):
    plan_template_id: int
    starts_at: datetime
    ends_at: datetime | None = None
    notes: str | None = None


class ClientSubscriptionUpdate(BaseModel):
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    status: str | None = None
    notes: str | None = None


class ClientSubscriptionRead(ORMBase):
    id: int
    client_id: int
    plan_template_id: int
    starts_at: datetime
    ends_at: datetime | None
    status: str
    notes: str | None
    plan_template: PlanTemplateRead | None = None
