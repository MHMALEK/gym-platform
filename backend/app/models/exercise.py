from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
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
    equipment: Mapped[str | None] = mapped_column(String(255), nullable=True)
    venue_type: Mapped[str] = mapped_column(String(32), nullable=False, default="both", server_default="both")
    tips: Mapped[str | None] = mapped_column(Text, nullable=True)
    common_mistakes: Mapped[str | None] = mapped_column(Text, nullable=True)
    correct_form_cues: Mapped[str | None] = mapped_column(Text, nullable=True)
    demo_media_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    external_source: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    external_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    difficulty: Mapped[str | None] = mapped_column(String(32), nullable=True)
    exercise_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    body_parts: Mapped[str | None] = mapped_column(Text, nullable=True)
    secondary_muscles: Mapped[str | None] = mapped_column(Text, nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    setup_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    safety_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    license_status: Mapped[str | None] = mapped_column(String(64), nullable=True)

    coach = relationship("Coach", back_populates="exercises", foreign_keys=[coach_id])
    plan_items = relationship("TrainingPlanItem", back_populates="exercise")
    muscle_links = relationship(
        "ExerciseMuscleGroup",
        back_populates="exercise",
        cascade="all, delete-orphan",
        order_by="ExerciseMuscleGroup.sort_order",
    )
    media_links = relationship(
        "ExerciseMedia", back_populates="exercise", cascade="all, delete-orphan"
    )
    video_links = relationship(
        "ExerciseVideoLink",
        back_populates="exercise",
        cascade="all, delete-orphan",
        order_by="ExerciseVideoLink.sort_order",
    )


class ExerciseVideoLink(Base, TimestampMixin):
    __tablename__ = "exercise_video_links"
    __table_args__ = (
        UniqueConstraint("exercise_id", "url", name="uq_exercise_video_link_url"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    exercise_id: Mapped[int] = mapped_column(
        ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False, default="youtube")
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="manual")

    exercise = relationship("Exercise", back_populates="video_links")
