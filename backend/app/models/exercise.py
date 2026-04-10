from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Exercise(Base, TimestampMixin):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # NULL = platform directory; set = custom exercise for that coach
    coach_id: Mapped[int | None] = mapped_column(
        ForeignKey("coaches.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    muscle_groups: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON or comma-separated
    equipment: Mapped[str | None] = mapped_column(String(255), nullable=True)
    venue_type: Mapped[str] = mapped_column(String(32), nullable=False, default="both", server_default="both")
    tips: Mapped[str | None] = mapped_column(Text, nullable=True)
    common_mistakes: Mapped[str | None] = mapped_column(Text, nullable=True)
    correct_form_cues: Mapped[str | None] = mapped_column(Text, nullable=True)
    demo_media_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    coach = relationship("Coach", back_populates="exercises", foreign_keys=[coach_id])
    plan_items = relationship("TrainingPlanItem", back_populates="exercise")
