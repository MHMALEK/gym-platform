from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ExerciseMuscleGroup(Base):
    __tablename__ = "exercise_muscle_groups"

    exercise_id: Mapped[int] = mapped_column(
        ForeignKey("exercises.id", ondelete="CASCADE"),
        primary_key=True,
    )
    muscle_group_id: Mapped[int] = mapped_column(
        ForeignKey("muscle_groups.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    exercise = relationship("Exercise", back_populates="muscle_links")
    muscle_group = relationship("MuscleGroup", back_populates="exercise_links")
