from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class TrainingPlanItem(Base, TimestampMixin):
    __tablename__ = "training_plan_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    training_plan_id: Mapped[int] = mapped_column(
        ForeignKey("training_plans.id", ondelete="CASCADE"), index=True, nullable=False
    )
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id", ondelete="RESTRICT"), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sets: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rest_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Coaching primitives. Weight stored in kg (UI may display kg or lb in the future).
    # RPE on the 0–10 scale (typically 0.5 increments). Tempo is freeform (e.g. "3-1-1-0").
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    rpe: Mapped[float | None] = mapped_column(Float, nullable=True)
    tempo: Mapped[str | None] = mapped_column(String(16), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Same block_id on adjacent (or reordered) rows = one structured block, e.g. superset.
    block_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    block_type: Mapped[str | None] = mapped_column(String(24), nullable=True)
    # 0-based index within the same block_id (first exercise in group = 0); None if not in a block.
    block_sequence: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # legacy_line = each row is one line (historical). exercise = head row (defaults for sets). set = row under head.
    row_type: Mapped[str] = mapped_column(String(24), server_default="legacy_line", default="legacy_line", nullable=False)
    # Shared id for exercise head + its set rows within a plan (UUID string).
    exercise_instance_id: Mapped[str | None] = mapped_column(String(40), nullable=True)

    training_plan = relationship("TrainingPlan", back_populates="items")
    exercise = relationship("Exercise", back_populates="plan_items")
