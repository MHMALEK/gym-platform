from collections.abc import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings


def _engine_kwargs() -> dict:
    """Postgres (Supabase pooler) needs TLS and must not cache prepared statements."""
    if not settings.database_url.startswith("postgresql"):
        return {}
    connect_args: dict = {"ssl": "require"}
    if "pooler.supabase.com" in settings.database_url:
        connect_args["statement_cache_size"] = 0
    return {"poolclass": NullPool, "connect_args": connect_args}


engine = create_async_engine(
    settings.database_url,
    echo=False,
    **_engine_kwargs(),
)


@event.listens_for(engine.sync_engine, "connect")
def _sqlite_enable_foreign_keys(dbapi_connection, _connection_record) -> None:
    # Use engine dialect: Pool's connection_record is not guaranteed to expose `.dialect` (SQLAlchemy 2.x).
    if engine.sync_engine.dialect.name != "sqlite":
        return
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
