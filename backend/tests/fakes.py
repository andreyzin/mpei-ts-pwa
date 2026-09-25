from datetime import date
from typing import Any

from app.schemas.common import EntityType


class FakeRuzClient:
    """Stands in for MpeiRuzClient and records what the service asked for."""

    def __init__(
        self,
        groups: list[dict[str, Any]] | None = None,
        lessons: list[dict[str, Any]] | None = None,
    ) -> None:
        self.groups = groups or []
        self.lessons = lessons or []
        self.search_queries: list[str] = []
        self.schedule_requests: list[tuple[int, date, date]] = []

    async def search(self, entity_type: EntityType, query: str) -> Any:
        self.search_queries.append(query)
        return [group for group in self.groups if query.casefold() in group["label"].casefold()]

    async def schedule(
        self, entity_type: EntityType, entity_id: int, date_from: date, date_to: date, locale: str
    ) -> Any:
        self.schedule_requests.append((entity_id, date_from, date_to))
        return self.lessons
