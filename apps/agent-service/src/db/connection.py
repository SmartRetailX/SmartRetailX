from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import asyncpg

from ..config import settings
from ..log import logger

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    if not settings.database_url:
        logger.warning(
            "DATABASE_URL is not set. DB-grounded intents will return empty results."
        )
        return
    _pool = await asyncpg.create_pool(settings.database_url, min_size=2, max_size=10)
    logger.info("asyncpg connection pool created")


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("asyncpg connection pool closed")


@asynccontextmanager
async def acquire() -> AsyncGenerator[asyncpg.Connection, None]:
    if _pool is None:
        if not settings.database_url:
            raise RuntimeError("DATABASE_URL is not configured – cannot run DB queries")
        # Fallback: single connection when pool is not initialised (e.g. tests)
        conn = await asyncpg.connect(settings.database_url)
        try:
            yield conn
        finally:
            await conn.close()
        return
    async with _pool.acquire() as conn:
        yield conn
