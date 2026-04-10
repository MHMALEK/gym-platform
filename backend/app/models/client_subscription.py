from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ClientSubscription(Base, TimestampMixin):
    __tablename__ = "client_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    plan_template_id: Mapped[int] = mapped_column(
        ForeignKey("plan_templates.id", ondelete="RESTRICT"), index=True
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    client = relationship("Client", back_populates="subscriptions")
    plan_template = relationship("PlanTemplate", back_populates="subscriptions")
