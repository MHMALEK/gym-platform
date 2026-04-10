from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class PlanTemplate(Base, TimestampMixin):
    __tablename__ = "plan_templates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(ForeignKey("coaches.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    discount_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(8), default="USD", nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    code: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    coach = relationship("Coach", back_populates="plan_templates")
    subscriptions = relationship("ClientSubscription", back_populates="plan_template")
    clients_designated = relationship(
        "Client",
        back_populates="subscription_plan_template",
        foreign_keys="Client.subscription_plan_template_id",
    )
