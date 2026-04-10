from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class NutritionTemplate(Base, TimestampMixin):
    """Reusable day meal plans: catalog rows (coach_id null) or coach-owned copies."""

    __tablename__ = "nutrition_templates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    coach_id: Mapped[int | None] = mapped_column(
        ForeignKey("coaches.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    meals_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_catalog_template_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    coach = relationship("Coach", back_populates="nutrition_templates")
