"""Which group each Telegram user has chosen. Postgres, so it survives restarts."""

from typing import Protocol

import asyncpg

from app.schedule_api import Group

# One table and no migration tool yet: a second schema change is the moment
# to introduce one instead of growing this statement.
SCHEMA = """
CREATE TABLE IF NOT EXISTS bot_user_groups (
    user_id BIGINT PRIMARY KEY,
    group_id INTEGER NOT NULL,
    group_name TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
"""


class GroupRepository(Protocol):
    async def get(self, user_id: int) -> Group | None: ...

    async def save(self, user_id: int, group: Group) -> None: ...


class PostgresGroupRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self.pool = pool

    async def create_schema(self) -> None:
        async with self.pool.acquire() as connection:
            await connection.execute(SCHEMA)

    async def get(self, user_id: int) -> Group | None:
        row = await self.pool.fetchrow(
            "SELECT group_id, group_name FROM bot_user_groups WHERE user_id = $1", user_id
        )
        return Group(id=row["group_id"], name=row["group_name"]) if row else None

    async def save(self, user_id: int, group: Group) -> None:
        await self.pool.execute(
            """
            INSERT INTO bot_user_groups (user_id, group_id, group_name)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id) DO UPDATE
            SET group_id = EXCLUDED.group_id, group_name = EXCLUDED.group_name, updated_at = now()
            """,
            user_id,
            group.id,
            group.name,
        )
