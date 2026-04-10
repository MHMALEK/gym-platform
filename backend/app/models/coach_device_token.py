from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class CoachDeviceToken(Base, TimestampMixin):
    __tablename__ = "coach_device_tokens"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(ForeignKey("coaches.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    platform: Mapped[str | None] = mapped_column(String(64), nullable=True)

    coach = relationship("Coach", back_populates="device_tokens")
