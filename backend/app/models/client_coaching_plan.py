from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ClientCoachingPlan(Base, TimestampMixin):
    """Per-client workout and diet plan notes (free text), one row per client."""

    __tablename__ = "client_coaching_plans"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    workout_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    workout_rich_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    program_venue: Mapped[str] = mapped_column(String(32), nullable=False, default="mixed", server_default="mixed")
    diet_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    diet_meals_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    workout_items_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_training_plan_id: Mapped[int | None] = mapped_column(
        ForeignKey("training_plans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assigned_nutrition_template_id: Mapped[int | None] = mapped_column(
        ForeignKey("nutrition_templates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    client = relationship("Client", back_populates="coaching_plan")
