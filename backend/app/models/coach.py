from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Coach(Base, TimestampMixin):
    __tablename__ = "coaches"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    clients = relationship("Client", back_populates="coach", cascade="all, delete-orphan")
    exercises = relationship("Exercise", back_populates="coach", foreign_keys="Exercise.coach_id")
    training_plans = relationship(
        "TrainingPlan", back_populates="coach", foreign_keys="TrainingPlan.coach_id"
    )
    plan_templates = relationship("PlanTemplate", back_populates="coach")
    nutrition_templates = relationship(
        "NutritionTemplate", back_populates="coach", foreign_keys="NutritionTemplate.coach_id"
    )
    device_tokens = relationship("CoachDeviceToken", back_populates="coach", cascade="all, delete-orphan")
    media_assets = relationship("MediaAsset", back_populates="coach", cascade="all, delete-orphan")
