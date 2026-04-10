from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class MediaAsset(Base, TimestampMixin):
    """Coach-owned binary or registered URL metadata (local disk, Firebase, S3, etc.)."""

    __tablename__ = "media_assets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(ForeignKey("coaches.id", ondelete="CASCADE"), index=True)
    storage_provider: Mapped[str] = mapped_column(String(32), nullable=False, default="local")
    # Relative path under upload root (local) or provider-specific key
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    content_type: Mapped[str] = mapped_column(String(128), nullable=False)
    byte_size: Mapped[int] = mapped_column(Integer, nullable=False)
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)

    coach = relationship("Coach", back_populates="media_assets")
    exercise_links = relationship("ExerciseMedia", back_populates="media_asset")


class ExerciseMedia(Base, TimestampMixin):
    """Links a media asset to an exercise with ordering and role (thumbnail, primary video, gallery)."""

    __tablename__ = "exercise_media"
    __table_args__ = (UniqueConstraint("exercise_id", "media_asset_id", name="uq_exercise_media_asset"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    exercise_id: Mapped[int] = mapped_column(
        ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False, index=True
    )
    media_asset_id: Mapped[int] = mapped_column(
        ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="gallery")

    exercise = relationship("Exercise", back_populates="media_links")
    media_asset = relationship("MediaAsset", back_populates="exercise_links")
