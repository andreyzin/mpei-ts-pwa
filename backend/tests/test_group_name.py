import asyncio

from fastapi.testclient import TestClient

from app.api.v1.public import service
from app.infrastructure.cache import MemoryCache
from app.main import app
from app.schemas.common import EntityType
from app.services.group_name import same_group_name, to_cyrillic
from app.services.public_service import PublicScheduleService
from tests.fakes import FakeRuzClient

GROUPS = [
    {"id": 101, "label": "А-06м-26", "description": "ИВТИ"},
    {"id": 102, "label": "А-06м-25", "description": "ИВТИ"},
    {"id": 103, "label": "ЭР-01-24", "description": "ИРЭ"},
]


def test_latin_letters_become_cyrillic_keeping_case() -> None:
    assert to_cyrillic("A-06m-26") == "А-06м-26"
    assert to_cyrillic("er-01-24") == "эр-01-24"
    assert to_cyrillic("Sh-1ya") == "Ш-1я"
    assert to_cyrillic("ZH-1") == "Ж-1"


def test_cyrillic_digits_and_punctuation_are_untouched() -> None:
    assert to_cyrillic("А-06м-26") == "А-06м-26"
    assert to_cyrillic("A-06м-26") == "А-06м-26"


def test_group_names_compare_across_alphabets_and_case() -> None:
    assert same_group_name("a-06M-26", "А-06м-26")
    assert not same_group_name("A-06m-2", "А-06м-26")


def test_group_search_sends_cyrillic_upstream() -> None:
    client = FakeRuzClient(GROUPS)
    result = asyncio.run(
        PublicScheduleService(client, MemoryCache()).search(EntityType.group, "A-06m", 10, 0)
    )

    assert client.search_queries == ["А-06м"]
    assert [item.name for item in result.items] == ["А-06м-26", "А-06м-25"]


def test_teacher_search_is_not_transliterated() -> None:
    client = FakeRuzClient()
    asyncio.run(
        PublicScheduleService(client, MemoryCache()).search(EntityType.teacher, "Ivanov", 10, 0)
    )

    assert client.search_queries == ["Ivanov"]


def test_find_group_needs_an_exact_name() -> None:
    service = PublicScheduleService(FakeRuzClient(GROUPS), MemoryCache())

    assert asyncio.run(service.find_group("a-06m-26")).id == 101
    assert asyncio.run(service.find_group("A-06m")) is None


def test_group_lookup_endpoint() -> None:
    async def fake_service() -> PublicScheduleService:
        return PublicScheduleService(FakeRuzClient(GROUPS), MemoryCache())

    app.dependency_overrides[service] = fake_service
    try:
        client = TestClient(app)
        found = client.get("/api/v1/groups/lookup", params={"name": "A-06m-26"})
        missing = client.get("/api/v1/groups/lookup", params={"name": "A-99"})
    finally:
        app.dependency_overrides.clear()

    assert found.status_code == 200
    assert found.json()["id"] == 101
    assert found.json()["name"] == "А-06м-26"
    assert missing.status_code == 404
