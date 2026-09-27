from collections.abc import AsyncIterator
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.config import get_settings
from app.infrastructure.rate_limit import RateLimiter
from app.providers.telegram.client import TelegramClient, TelegramError
from app.schemas.suggestions import SuggestionRequest
from app.services.suggestion_service import SuggestionService

router = APIRouter()
# Per hour, not per minute: a person suggests a few things, a script thousands.
limiter = RateLimiter(get_settings().suggestions_per_hour, window_seconds=3600)


async def suggestion_service() -> AsyncIterator[SuggestionService]:
    settings = get_settings()
    if settings.telegram_bot_token is None or not settings.suggestions_chat_id:
        raise HTTPException(status_code=503, detail="Suggestions are not configured")
    async with httpx.AsyncClient(timeout=settings.ruz_timeout_seconds) as client:
        telegram = TelegramClient(
            client, settings.telegram_bot_token.get_secret_value(), settings.telegram_api_base
        )
        yield SuggestionService(telegram, settings.suggestions_chat_id)


@router.post("/suggestions", status_code=status.HTTP_202_ACCEPTED)
async def submit_suggestion(
    suggestion: SuggestionRequest,
    request: Request,
    response: Response,
    service: Annotated[SuggestionService, Depends(suggestion_service)],
) -> None:
    """Sends a feature suggestion to the maintainers' Telegram chat.

    Errors: 422 invalid body, 429 too many per hour, 503 not configured,
    502 Telegram did not accept the message.
    """
    allowed, retry_after = limiter.allow(request.client.host if request.client else "unknown")
    if not allowed:
        response.headers["Retry-After"] = str(retry_after)
        raise HTTPException(status_code=429, detail="Too many suggestions")
    try:
        await service.submit(suggestion)
    except TelegramError as error:
        raise HTTPException(status_code=502, detail="Suggestion was not delivered") from error
