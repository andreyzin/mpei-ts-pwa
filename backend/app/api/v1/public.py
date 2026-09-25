from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response

from app.config import get_settings
from app.infrastructure.cache import MemoryCache
from app.infrastructure.http import http_client
from app.infrastructure.rate_limit import RateLimiter
from app.providers.mpei_ruz.client import MpeiRuzClient, RuzUpstreamError
from app.schemas.common import EntityType, ScheduleResponse, SearchItem, SearchResponse
from app.services.public_service import PublicScheduleService

router = APIRouter()
cache = MemoryCache()
limiter = RateLimiter(get_settings().rate_limit_per_minute)


async def service() -> PublicScheduleService:
    settings = get_settings()
    async with http_client(settings) as client:
        yield PublicScheduleService(MpeiRuzClient(client), cache, settings.cache_ttl_seconds)


Service = Annotated[PublicScheduleService, Depends(service)]


def check_limit(request: Request, response: Response) -> None:
    allowed, retry_after = limiter.allow(
        f"{request.client.host if request.client else 'unknown'}:{request.url.path}"
    )
    if not allowed:
        response.headers["Retry-After"] = str(retry_after)
        raise HTTPException(status_code=429, detail="Rate limit exceeded")


@router.get("/search", response_model=SearchResponse)
async def search(
    request: Request,
    response: Response,
    service: Service,
    type: EntityType = Query(...),
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
) -> SearchResponse:
    check_limit(request, response)
    try:
        return await service.search(type, q.strip(), limit, offset)
    except RuzUpstreamError as error:
        raise HTTPException(status_code=502, detail="Schedule provider unavailable") from error


@router.get("/groups/lookup", response_model=SearchItem)
async def group_lookup(
    request: Request,
    response: Response,
    service: Service,
    name: str = Query(..., min_length=1, max_length=100),
) -> SearchItem:
    """Exact group by name; a Latin spelling (`A-06m-26`) is read as Cyrillic."""
    check_limit(request, response)
    try:
        group = await service.find_group(name)
    except RuzUpstreamError as error:
        raise HTTPException(status_code=502, detail="Schedule provider unavailable") from error
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


async def _schedule(
    entity_type: EntityType,
    entity_id: int,
    request: Request,
    response: Response,
    service: Service,
    date_from: date = Query(..., alias="from"),
    date_to: date = Query(..., alias="to"),
    locale: str = Query("ru", pattern="^(ru|en)$"),
) -> ScheduleResponse:
    check_limit(request, response)
    if date_to < date_from or (date_to - date_from).days > 31:
        raise HTTPException(status_code=400, detail="Date range must be 0..31 days")
    try:
        return await service.schedule(
            entity_type, entity_id, str(entity_id), date_from, date_to, locale
        )
    except RuzUpstreamError as error:
        raise HTTPException(status_code=502, detail="Schedule provider unavailable") from error


@router.get("/groups/{entity_id}/schedule", response_model=ScheduleResponse)
async def group_schedule(
    entity_id: int,
    request: Request,
    response: Response,
    service: Service,
    date_from: date = Query(..., alias="from"),
    date_to: date = Query(..., alias="to"),
    locale: str = Query("ru", pattern="^(ru|en)$"),
) -> ScheduleResponse:
    return await _schedule(
        EntityType.group, entity_id, request, response, service, date_from, date_to, locale
    )


@router.get("/teachers/{entity_id}/schedule", response_model=ScheduleResponse)
async def teacher_schedule(
    entity_id: int,
    request: Request,
    response: Response,
    service: Service,
    date_from: date = Query(..., alias="from"),
    date_to: date = Query(..., alias="to"),
    locale: str = Query("ru", pattern="^(ru|en)$"),
) -> ScheduleResponse:
    return await _schedule(
        EntityType.teacher, entity_id, request, response, service, date_from, date_to, locale
    )


@router.get("/rooms/{entity_id}/schedule", response_model=ScheduleResponse)
async def room_schedule(
    entity_id: int,
    request: Request,
    response: Response,
    service: Service,
    date_from: date = Query(..., alias="from"),
    date_to: date = Query(..., alias="to"),
    locale: str = Query("ru", pattern="^(ru|en)$"),
) -> ScheduleResponse:
    return await _schedule(
        EntityType.room, entity_id, request, response, service, date_from, date_to, locale
    )
