from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class CoachApiKey(Base, TimestampMixin):
    """Stored hash of a coach API key (MCP / machine clients). Plaintext is shown once at creation."""

    __tablename__ = "coach_api_keys"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(
        ForeignKey("coaches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    key_prefix: Mapped[str] = mapped_column(String(24), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    label: Mapped[str | None] = mapped_column(String(128), nullable=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    coach = relationship("Coach", back_populates="api_keys")
