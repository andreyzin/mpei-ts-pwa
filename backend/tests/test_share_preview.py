import asyncio
from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.api.v1.public import service
from app.infrastructure.cache import MemoryCache
from app.main import app
from app.providers.mpei_ruz.client import RuzUpstreamError
from app.services.public_service import PublicScheduleService
from app.services.share_preview import (
    SharePreviewNotFound,
    build_share_preview,
    parse_share_date,
)
from tests.fakes import FakeRuzClient

TODAY = date(2026, 9, 25)
GROUPS = [{"id": 101, "label": "А-06м-26", "description": "ИВТИ"}]
LESSONS = [
    {
        "date": "2026.09.02",
        "beginLesson": "11:10",
        "endLesson": "12:45",
        "discipline": "Физика",
        "kindOfWork": "Лабораторная работа",
        "auditorium": "Б-300",
        "subGroupOid": 0,
    },
    {
        "date": "2026.09.02",
        "beginLesson": "09:20",
        "endLesson": "10:55",
        "discipline": "Высшая математика",
        "kindOfWork": "Лекция",
        "auditorium": "М-611",
        "subGroupOid": 0,
    },
]


@pytest.mark.parametrize("raw", ["2-9", "02-09", "02-09-26", "02-09-2026", "2-9-2026"])
def test_share_date_formats_mean_the_same_day(raw: str) -> None:
    assert parse_share_date(raw, TODAY) == date(2026, 9, 2)


def test_missing_share_date_is_today() -> None:
    assert parse_share_date(None, TODAY) == TODAY


@pytest.mark.parametrize("raw", ["31-2", "2-13", "2", "2-9-202", "02.09.2026", "today"])
def test_invalid_share_date_is_rejected(raw: str) -> None:
    assert parse_share_date(raw, TODAY) is None


def test_preview_lists_the_day_in_time_order() -> None:
    client = FakeRuzClient(GROUPS, LESSONS)
    preview = asyncio.run(
        build_share_preview(PublicScheduleService(client, MemoryCache()), "A-06m-26", "2-9", TODAY)
    )

    assert client.schedule_requests == [(101, date(2026, 9, 2), date(2026, 9, 2))]
    assert preview.title == "А-06м-26 — среда, 2 сентября"
    assert preview.description == (
        "09:20–10:55 · Высшая математика · Лекция · М-611\n"
        "11:10–12:45 · Физика · Лабораторная · Б-300"
    )
    assert preview.app_url == "/?group=101&date=02-09-2026"


def test_preview_of_a_free_day_from_another_year() -> None:
    preview = asyncio.run(
        build_share_preview(
            PublicScheduleService(FakeRuzClient(GROUPS), MemoryCache()),
            "А-06м-26",
            "5-1-27",
            TODAY,
        )
    )

    assert preview.title == "А-06м-26 — вторник, 5 января 2027"
    assert preview.description == "Пар нет"


def test_unknown_group_has_no_preview() -> None:
    with pytest.raises(SharePreviewNotFound):
        asyncio.run(
            build_share_preview(
                PublicScheduleService(FakeRuzClient(GROUPS), MemoryCache()), "A-99", None, TODAY
            )
        )


class BrokenRuzClient(FakeRuzClient):
    async def search(self, *args: object) -> object:
        raise RuzUpstreamError("down")


@pytest.fixture
def share_client():
    def use(ruz_client: FakeRuzClient) -> TestClient:
        async def fake_service() -> PublicScheduleService:
            return PublicScheduleService(ruz_client, MemoryCache())

        app.dependency_overrides[service] = fake_service
        return TestClient(app)

    yield use
    app.dependency_overrides.clear()


def test_share_page_carries_open_graph_tags_and_leads_to_the_app(share_client) -> None:
    response = share_client(FakeRuzClient(GROUPS, LESSONS)).get("/share/A-06m-26/2-9")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert '<meta property="og:title" content="А-06м-26 — среда, 2 сентября" />' in response.text
    assert "09:20–10:55 · Высшая математика · Лекция · М-611&#10;11:10" in response.text
    assert 'location.replace("/?group=101&date=02-09-2026")' in response.text


def test_share_page_escapes_upstream_text(share_client) -> None:
    lessons = [{**LESSONS[0], "discipline": '"><script>alert(1)</script>'}]
    response = share_client(FakeRuzClient(GROUPS, lessons)).get("/share/A-06m-26/2-9")

    assert "<script>alert" not in response.text
    assert "&quot;&gt;&lt;script&gt;" in response.text


def test_share_page_for_unknown_group_or_date(share_client) -> None:
    client = share_client(FakeRuzClient(GROUPS))

    assert client.get("/share/A-99/2-9").status_code == 404
    assert client.get("/share/A-06m-26/31-2").status_code == 404


def test_share_page_when_ruz_is_down(share_client) -> None:
    response = share_client(BrokenRuzClient()).get("/share/A-06m-26")

    assert response.status_code == 502
    assert "Расписание временно недоступно" in response.text
