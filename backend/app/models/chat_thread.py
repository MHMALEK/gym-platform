from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


def _msg_created_at() -> datetime:
    return datetime.utcnow()


class ChatThread(Base, TimestampMixin):
    """One conversation per coach–client pair."""

    __tablename__ = "chat_threads"
    __table_args__ = (UniqueConstraint("coach_id", "client_id", name="uq_chat_threads_coach_client"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(ForeignKey("coaches.id", ondelete="CASCADE"), index=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)

    coach = relationship("Coach", back_populates="chat_threads")
    client = relationship("Client", back_populates="chat_thread")
    messages = relationship(
        "ChatMessage",
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="ChatMessage.id",
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("chat_threads.id", ondelete="CASCADE"), index=True)
    sender_type: Mapped[str] = mapped_column(String(16), nullable=False)  # coach | client
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_msg_created_at, nullable=False)

    thread = relationship("ChatThread", back_populates="messages")
