"""Client of our backend. The bot never talks to RUZ, only to the normalized API."""

import time
from datetime import date
from typing import Any

import httpx
from pydantic import BaseModel


class ScheduleApiError(RuntimeError):
    pass


class Group(BaseModel):
    id: int
    name: str


class RoomRef(BaseModel):
    name: str


class Lesson(BaseModel):
    start: str
    finish: str
    subject: str
    type: str
    raw_type: str | None = None
    room: RoomRef | None = None
    status: str = "scheduled"


class Day(BaseModel):
    date: date
    lessons: list[Lesson]


class _TtlCache:
    def __init__(self, ttl_seconds: float) -> None:
        self.ttl = ttl_seconds
        self._entries: dict[object, tuple[float, Any]] = {}

    def get(self, key: object) -> tuple[bool, Any]:
        entry = self._entries.get(key)
        if entry is None or entry[0] <= time.monotonic():
            return False, None
        return True, entry[1]

    def set(self, key: object, value: Any) -> None:
        self._entries[key] = (time.monotonic() + self.ttl, value)


class ScheduleApi:
    # Inline queries repeat on every keystroke; short caches keep them off the API.
    def __init__(self, client: httpx.AsyncClient, ttl_seconds: float = 300) -> None:
        self.client = client
        self._lookups = _TtlCache(ttl_seconds)
        self._days = _TtlCache(ttl_seconds)

    async def _get(self, path: str, params: dict[str, str | int]) -> httpx.Response:
        try:
            return await self.client.get(path, params=params)
        except httpx.HTTPError as error:
            raise ScheduleApiError(type(error).__name__) from error

    async def find_group(self, name: str) -> Group | None:
        """Exact name; the backend reads a Latin spelling as Cyrillic."""
        key = name.strip().casefold()
        hit, cached = self._lookups.get(key)
        if hit:
            return cached
        response = await self._get("/api/v1/groups/lookup", {"name": name.strip()})
        if response.status_code == 404:
            group = None
        elif response.is_error:
            raise ScheduleApiError(f"lookup returned {response.status_code}")
        else:
            group = Group.model_validate(response.json())
        self._lookups.set(key, group)
        return group

    async def search_groups(self, query: str, limit: int = 6) -> list[Group]:
        response = await self._get(
            "/api/v1/search", {"type": "group", "q": query.strip(), "limit": limit}
        )
        if response.is_error:
            raise ScheduleApiError(f"search returned {response.status_code}")
        return [Group.model_validate(item) for item in response.json()["items"]]

    async def days(self, group_id: int, date_from: date, date_to: date) -> list[Day]:
        key = (group_id, date_from, date_to)
        hit, cached = self._days.get(key)
        if hit:
            return cached
        response = await self._get(
            f"/api/v1/groups/{group_id}/schedule",
            {"from": date_from.isoformat(), "to": date_to.isoformat()},
        )
        if response.is_error:
            raise ScheduleApiError(f"schedule returned {response.status_code}")
        days = [Day.model_validate(day) for day in response.json()["days"]]
        self._days.set(key, days)
        return days
