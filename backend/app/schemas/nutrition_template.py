from pydantic import BaseModel, Field

from app.schemas.client import DietMeal
from app.schemas.common import ORMBase


class NutritionTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    notes_plan: str | None = None
    meals: list[DietMeal] = Field(default_factory=list, max_length=64)


class NutritionTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    notes_plan: str | None = None
    meals: list[DietMeal] | None = Field(default=None, max_length=64)


class NutritionTemplateSummary(ORMBase):
    id: int
    coach_id: int | None
    name: str
    description: str | None
    meal_count: int = 0
    source_catalog_template_id: int | None = None


class NutritionTemplateRead(ORMBase):
    id: int
    coach_id: int | None
    name: str
    description: str | None
    notes_plan: str | None = None
    meals: list[DietMeal] = Field(default_factory=list)
    source_catalog_template_id: int | None = None
