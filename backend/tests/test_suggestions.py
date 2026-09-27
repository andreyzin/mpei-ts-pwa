import asyncio
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.v1 import suggestions
from app.infrastructure.rate_limit import RateLimiter
from app.main import app
from app.providers.telegram.client import TelegramClient, TelegramError
from app.schemas.suggestions import SuggestionRequest
from app.services.suggestion_service import SuggestionService, format_suggestion


class FakeTelegram:
    def __init__(self, fail: bool = False) -> None:
        self.fail = fail
        self.sent: list[tuple[str, str]] = []

    async def send_message(self, chat_id: str, html: str) -> None:
        if self.fail:
            raise TelegramError("down")
        self.sent.append((chat_id, html))


@pytest.fixture
def post(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(suggestions, "limiter", RateLimiter(2, window_seconds=3600))

    def use(telegram: FakeTelegram | None, body: dict[str, object]) -> httpx.Response:
        if telegram is not None:

            async def fake_service() -> SuggestionService:
                return SuggestionService(telegram, "42")  # type: ignore[arg-type]

            app.dependency_overrides[suggestions.suggestion_service] = fake_service
        return TestClient(app).post("/api/v1/suggestions", json=body)

    yield use
    app.dependency_overrides.clear()


def test_suggestion_text_is_escaped_for_telegram_html() -> None:
    message = format_suggestion(SuggestionRequest(text="<b>тёмная</b> тема", contact="@me"))

    assert message == "<b>Предложение</b>\n\n&lt;b&gt;тёмная&lt;/b&gt; тема\n\nКонтакт: @me"


def test_suggestion_reaches_the_chat(post) -> None:
    telegram = FakeTelegram()
    response = post(telegram, {"text": "  Тёмная тема для виджета  "})

    assert response.status_code == 202
    assert telegram.sent == [("42", "<b>Предложение</b>\n\nТёмная тема для виджета")]


@pytest.mark.parametrize(
    "body", [{"text": "ok"}, {"text": "x" * 2001}, {"text": "Идея", "extra": 1}, {}]
)
def test_invalid_suggestion_is_rejected(post, body: dict[str, object]) -> None:
    telegram = FakeTelegram()

    assert post(telegram, body).status_code == 422
    assert telegram.sent == []


def test_suggestions_are_limited_per_hour(post) -> None:
    telegram = FakeTelegram()
    codes = [post(telegram, {"text": f"Идея {index}"}).status_code for index in range(3)]

    assert codes == [202, 202, 429]


def test_undelivered_suggestion_is_an_error(post) -> None:
    assert post(FakeTelegram(fail=True), {"text": "Идея"}).status_code == 502


def test_suggestions_without_telegram_settings_are_unavailable(post) -> None:
    assert post(None, {"text": "Идея"}).status_code == 503


def test_telegram_client_sends_html_without_previews() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"ok": True})

    async def send() -> None:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            await TelegramClient(client, "T0KEN", "http://bot-api:8081/").send_message("42", "hi")

    asyncio.run(send())

    assert str(requests[0].url) == "http://bot-api:8081/botT0KEN/sendMessage"
    assert json.loads(requests[0].content) == {
        "chat_id": "42",
        "text": "hi",
        "parse_mode": "HTML",
        "link_preview_options": {"is_disabled": True},
    }


def test_telegram_errors_do_not_leak_the_token() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError(f"cannot reach {request.url}")

    async def send() -> None:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            await TelegramClient(client, "T0KEN", "http://bot-api").send_message("42", "hi")

    with pytest.raises(TelegramError) as error:
        asyncio.run(send())

    assert "T0KEN" not in str(error.value)
    assert error.value.__cause__ is None
