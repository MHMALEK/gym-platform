"""Coach–client chat persistence (threads + messages)."""

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_thread import ChatMessage, ChatThread
from app.models.client import Client

CHAT_MESSAGE_MAX_LEN = 8000

SENDER_COACH = "coach"
SENDER_CLIENT = "client"


async def get_thread_for_coach_client(
    db: AsyncSession, *, coach_id: int, client_id: int
) -> ChatThread | None:
    result = await db.execute(
        select(ChatThread).where(
            ChatThread.coach_id == coach_id,
            ChatThread.client_id == client_id,
        )
    )
    return result.scalar_one_or_none()


async def ensure_thread(db: AsyncSession, *, coach_id: int, client_id: int) -> ChatThread:
    """Create thread if missing. Caller must verify roster ownership."""
    existing = await get_thread_for_coach_client(db, coach_id=coach_id, client_id=client_id)
    if existing:
        return existing
    row = ChatThread(coach_id=coach_id, client_id=client_id)
    db.add(row)
    await db.flush()
    return row


async def fetch_client_for_coach(db: AsyncSession, *, coach_id: int, client_id: int) -> Client | None:
    result = await db.execute(select(Client).where(Client.id == client_id, Client.coach_id == coach_id))
    return result.scalar_one_or_none()


async def list_messages(
    db: AsyncSession,
    *,
    thread_id: int,
    limit: int,
    after_id: int | None,
) -> list[ChatMessage]:
    limit = min(max(limit, 1), 200)
    if after_id is not None:
        result = await db.execute(
            select(ChatMessage)
            .where(
                ChatMessage.thread_id == thread_id,
                ChatMessage.id > after_id,
            )
            .order_by(ChatMessage.id.asc())
            .limit(limit)
        )
        return list(result.scalars().all())
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.id.desc())
        .limit(limit)
    )
    rows = list(result.scalars().all())
    rows.reverse()
    return rows


async def append_coach_message(
    db: AsyncSession,
    *,
    thread_id: int,
    body: str,
) -> ChatMessage:
    msg = ChatMessage(thread_id=thread_id, sender_type=SENDER_COACH, body=body)
    db.add(msg)
    await db.flush()
    return msg


async def append_client_message(
    db: AsyncSession,
    *,
    thread_id: int,
    body: str,
) -> ChatMessage:
    msg = ChatMessage(thread_id=thread_id, sender_type=SENDER_CLIENT, body=body)
    db.add(msg)
    await db.flush()
    return msg


async def get_coach_message_inbox_summary(
    db: AsyncSession,
    *,
    coach_id: int,
    limit: int = 20,
) -> dict[str, object]:
    """Threads where the client's message is last — coach has not replied yet."""
    limit = min(max(limit, 1), 40)
    latest_msg = (
        select(
            ChatMessage.thread_id.label("thread_id"),
            func.max(ChatMessage.id).label("max_id"),
        )
        .group_by(ChatMessage.thread_id)
        .subquery()
    )
    stmt = (
        select(ChatMessage, ChatThread, Client)
        .join(
            latest_msg,
            (ChatMessage.thread_id == latest_msg.c.thread_id)
            & (ChatMessage.id == latest_msg.c.max_id),
        )
        .join(ChatThread, ChatThread.id == ChatMessage.thread_id)
        .join(Client, Client.id == ChatThread.client_id)
        .where(
            ChatThread.coach_id == coach_id,
            ChatMessage.sender_type == SENDER_CLIENT,
        )
        .order_by(ChatMessage.id.desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    awaiting = [
        {
            "client_id": client.id,
            "client_name": client.name,
            "thread_id": thread.id,
            "last_message_id": msg.id,
            "last_message_at": msg.created_at.isoformat() if msg.created_at else None,
            "preview": (msg.body or "")[:240],
        }
        for msg, thread, client in rows
    ]
    total_threads = (
        await db.execute(select(func.count()).select_from(ChatThread).where(ChatThread.coach_id == coach_id))
    ).scalar_one()
    return {
        "total_threads": int(total_threads or 0),
        "awaiting_reply_count": len(awaiting),
        "awaiting_reply": awaiting,
        "_note": (
            "awaiting_reply = conversations where the client's message is most recent "
            "(coach has not replied yet). There are no separate read receipts in the app."
        ),
    }
