from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class TrainingPlan(Base, TimestampMixin):
    __tablename__ = "training_plans"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    coach_id: Mapped[int | None] = mapped_column(
        ForeignKey("coaches.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_catalog_plan_id: Mapped[int | None] = mapped_column(nullable=True)

    coach = relationship("Coach", back_populates="training_plans", foreign_keys=[coach_id])
    items = relationship(
        "TrainingPlanItem",
        back_populates="training_plan",
        cascade="all, delete-orphan",
        order_by="TrainingPlanItem.sort_order",
    )
