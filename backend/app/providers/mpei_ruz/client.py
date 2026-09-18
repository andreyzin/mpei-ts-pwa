from datetime import date
from typing import Any

import httpx

from app.schemas.common import EntityType


class RuzUpstreamError(RuntimeError):
    pass


class MpeiRuzClient:
    SEARCH_TYPES = {
        EntityType.group: "group",
        EntityType.teacher: "person",
        EntityType.room: "auditorium",
    }
    SCHEDULE_TYPES = {
        EntityType.group: "group",
        EntityType.teacher: "person",
        EntityType.room: "auditorium",
    }

    def __init__(self, client: httpx.AsyncClient) -> None:
        self.client = client

    async def search(self, entity_type: EntityType, query: str) -> Any:
        response = await self.client.get(
            "/api/search", params={"term": query, "type": self.SEARCH_TYPES[entity_type]}
        )
        if response.is_error:
            raise RuzUpstreamError(f"search returned {response.status_code}")
        return response.json()

    async def schedule(
        self, entity_type: EntityType, entity_id: int, date_from: date, date_to: date, locale: str
    ) -> Any:
        response = await self.client.get(
            f"/api/schedule/{self.SCHEDULE_TYPES[entity_type]}/{entity_id}",
            params={
                "start": date_from.strftime("%Y.%m.%d"),
                "finish": date_to.strftime("%Y.%m.%d"),
                "lng": 1 if locale == "ru" else 0,
            },
        )
        if response.status_code == 404:
            raise RuzUpstreamError("entity not found")
        if response.is_error:
            raise RuzUpstreamError(f"schedule returned {response.status_code}")
        return response.json()
