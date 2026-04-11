from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Coach(Base, TimestampMixin):
    __tablename__ = "coaches"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    tagline: Mapped[str | None] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[str | None] = mapped_column(String(16), nullable=True)
    logo_media_asset_id: Mapped[int | None] = mapped_column(
        ForeignKey("media_assets.id", ondelete="SET NULL"), nullable=True, index=True
    )

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
    media_assets = relationship(
        "MediaAsset",
        back_populates="coach",
        foreign_keys="MediaAsset.coach_id",
        cascade="all, delete-orphan",
    )
    logo_asset = relationship(
        "MediaAsset",
        foreign_keys=[logo_media_asset_id],
        uselist=False,
    )
    invoice_sequences = relationship(
        "CoachInvoiceSequence",
        back_populates="coach",
        cascade="all, delete-orphan",
    )
