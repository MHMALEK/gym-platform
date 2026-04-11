from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class CoachInvoiceSequence(Base):
    __tablename__ = "coach_invoice_sequences"
    __table_args__ = (UniqueConstraint("coach_id", "year", name="uq_coach_invoice_sequences_coach_year"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(ForeignKey("coaches.id", ondelete="CASCADE"), index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    last_number: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    coach = relationship("Coach", back_populates="invoice_sequences")
