import hashlib
from datetime import date

from app.infrastructure.cache import MemoryCache
from app.providers.mpei_ruz.client import MpeiRuzClient
from app.providers.mpei_ruz.mapper import map_schedule, map_search
from app.schemas.common import (
    EntityType,
    Pagination,
    ScheduleResponse,
    SearchItem,
    SearchResponse,
)
from app.services.group_name import same_group_name, to_cyrillic


class PublicScheduleService:
    def __init__(self, client: MpeiRuzClient, cache: MemoryCache, ttl: int = 900) -> None:
        self.client = client
        self.cache = cache
        self.ttl = ttl

    async def search(
        self, entity_type: EntityType, query: str, limit: int, offset: int
    ) -> SearchResponse:
        if entity_type == EntityType.group:
            query = to_cyrillic(query)
        key = f"search:{entity_type}:{query.casefold()}:{limit}:{offset}"
        cached = await self.cache.get(key)
        if cached is not None:
            return SearchResponse.model_validate(cached)
        items = map_search(await self.client.search(entity_type, query), entity_type)
        page = items[offset : offset + limit]
        response = SearchResponse(
            items=page,
            pagination=Pagination(
                limit=limit, offset=offset, total=len(items), has_more=offset + limit < len(items)
            ),
        )
        await self.cache.set(key, response.model_dump(mode="json"), 600)
        return response

    async def find_group(self, name: str) -> SearchItem | None:
        """Exact match only: a share link must not open a neighbouring group."""
        found = await self.search(EntityType.group, name.strip(), limit=50, offset=0)
        return next((item for item in found.items if same_group_name(item.name, name)), None)

    async def schedule(
        self,
        entity_type: EntityType,
        entity_id: int,
        name: str,
        date_from: date,
        date_to: date,
        locale: str,
    ) -> ScheduleResponse:
        raw_key = f"schedule:{entity_type}:{entity_id}:{date_from}:{date_to}:{locale}"
        key = hashlib.sha256(raw_key.encode()).hexdigest()
        cached = await self.cache.get(key)
        if cached is not None:
            result = ScheduleResponse.model_validate(cached)
            result.meta.cached = True
            return result
        result = map_schedule(
            await self.client.schedule(entity_type, entity_id, date_from, date_to, locale),
            entity_type,
            entity_id,
            name,
            date_from,
            date_to,
        )
        await self.cache.set(key, result.model_dump(mode="json", by_alias=True), self.ttl)
        return result
