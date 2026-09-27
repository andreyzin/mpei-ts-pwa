"""Runs against a real Postgres when TEST_DATABASE_URL is set; skipped otherwise."""

import asyncio
import os

import asyncpg
import pytest

from app.schedule_api import Group
from app.storage import PostgresGroupRepository

DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(DATABASE_URL is None, reason="TEST_DATABASE_URL is not set")


def test_saved_group_is_read_back_and_replaced() -> None:
    async def scenario() -> list[Group | None]:
        pool = await asyncpg.create_pool(DATABASE_URL)
        try:
            repository = PostgresGroupRepository(pool)
            await repository.create_schema()
            await repository.create_schema()  # startup runs it every time
            await pool.execute("DELETE FROM bot_user_groups WHERE user_id = ANY($1)", [1, 2])
            before = await repository.get(1)
            await repository.save(1, Group(id=101, name="А-06м-26"))
            saved = await repository.get(1)
            await repository.save(1, Group(id=202, name="Э-01-24"))
            replaced = await repository.get(1)
            other = await repository.get(2)
            return [before, saved, replaced, other]
        finally:
            await pool.close()

    before, saved, replaced, other = asyncio.run(scenario())

    assert before is None
    assert saved == Group(id=101, name="А-06м-26")
    assert replaced == Group(id=202, name="Э-01-24")
    assert other is None
