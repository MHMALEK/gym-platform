from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Client(Base, TimestampMixin):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(ForeignKey("coaches.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # active: in good standing, inactive: paused/deactivated, archived: off roster
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    height_cm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    goal_type_id: Mapped[int | None] = mapped_column(
        ForeignKey("goal_types.id", ondelete="SET NULL"), nullable=True, index=True
    )
    goal: Mapped[str | None] = mapped_column(String(500), nullable=True)  # free-text description
    subscription_plan_template_id: Mapped[int | None] = mapped_column(
        ForeignKey("plan_templates.id", ondelete="SET NULL"), nullable=True, index=True
    )
    account_status: Mapped[str] = mapped_column(
        String(32), default="good_standing", nullable=False
    )  # good_standing, payment_issue, onboarding, churned
    # Coach-only label: how they intend to collect (no payment rails).
    billing_preference: Mapped[str | None] = mapped_column(String(32), nullable=True)

    coach = relationship("Coach", back_populates="clients")
    goal_type_catalog = relationship("GoalType", back_populates="clients", foreign_keys=[goal_type_id])
    subscription_plan_template = relationship(
        "PlanTemplate",
        back_populates="clients_designated",
        foreign_keys=[subscription_plan_template_id],
    )
    subscriptions = relationship("ClientSubscription", back_populates="client", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="client", cascade="all, delete-orphan")
    coaching_plan = relationship(
        "ClientCoachingPlan",
        back_populates="client",
        uselist=False,
        cascade="all, delete-orphan",
    )
