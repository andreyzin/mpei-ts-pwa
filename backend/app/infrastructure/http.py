from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx

from app.config import Settings


@asynccontextmanager
async def http_client(settings: Settings) -> AsyncIterator[httpx.AsyncClient]:
    timeout = httpx.Timeout(settings.ruz_timeout_seconds)
    async with httpx.AsyncClient(
        base_url=settings.ruz_base_url,
        timeout=timeout,
        headers={"Accept": "application/json", "User-Agent": "mpei-schedule-api/1.0"},
        follow_redirects=True,
    ) as client:
        yield client
