from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def _utc_naive() -> datetime:
    return datetime.utcnow()


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_naive, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=_utc_naive, onupdate=_utc_naive, nullable=False
    )
