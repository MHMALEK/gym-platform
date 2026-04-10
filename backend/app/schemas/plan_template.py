from decimal import Decimal

from pydantic import BaseModel

from app.schemas.common import ORMBase


class PlanTemplateCreate(BaseModel):
    name: str
    description: str | None = None
    duration_days: int
    price: Decimal | None = None
    discount_price: Decimal | None = None
    currency: str = "USD"
    image_url: str | None = None
    code: str | None = None
    sort_order: int = 0
    is_active: bool = True


class PlanTemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    duration_days: int | None = None
    price: Decimal | None = None
    discount_price: Decimal | None = None
    currency: str | None = None
    image_url: str | None = None
    code: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class PlanTemplateRead(ORMBase):
    id: int
    coach_id: int
    name: str
    description: str | None
    duration_days: int
    price: Decimal | None
    discount_price: Decimal | None
    currency: str
    image_url: str | None
    code: str | None
    sort_order: int
    is_active: bool
