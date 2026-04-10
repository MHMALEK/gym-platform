from sqlalchemy import ForeignKey, Text
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
    diet_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    workout_items_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    client = relationship("Client", back_populates="coaching_plan")
