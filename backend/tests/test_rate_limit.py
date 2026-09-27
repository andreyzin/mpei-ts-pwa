import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.api.v1 import public
from app.config import get_settings
from app.infrastructure.cache import MemoryCache
from app.infrastructure.rate_limit import RateLimiter
from app.main import app
from app.services.public_service import PublicScheduleService
from tests.fakes import FakeRuzClient


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(public, "limiter", RateLimiter(1))
    monkeypatch.setattr(get_settings(), "internal_api_token", SecretStr("s3cret"))

    async def fake_service() -> PublicScheduleService:
        return PublicScheduleService(FakeRuzClient(), MemoryCache())

    app.dependency_overrides[public.service] = fake_service
    yield TestClient(app)
    app.dependency_overrides.clear()


def _search(client: TestClient, headers: dict[str, str] | None = None) -> int:
    return client.get("/api/v1/search?type=group&q=A-06", headers=headers).status_code


def test_public_clients_are_rate_limited(client: TestClient) -> None:
    assert [_search(client), _search(client)] == [200, 429]


def test_internal_clients_are_not(client: TestClient) -> None:
    headers = {"x-internal-token": "s3cret"}

    assert [_search(client, headers) for _ in range(3)] == [200, 200, 200]


def test_a_wrong_internal_token_is_an_ordinary_client(client: TestClient) -> None:
    headers = {"x-internal-token": "guess"}

    assert [_search(client, headers), _search(client, headers)] == [200, 429]
