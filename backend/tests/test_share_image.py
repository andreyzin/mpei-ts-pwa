from datetime import date, time
from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from app.api.v1.public import service
from app.infrastructure.cache import MemoryCache
from app.main import app
from app.schemas.common import EntityType, Lesson, LessonType, ScheduleDay, SearchItem
from app.services.public_service import PublicScheduleService
from app.services.share_image import HEIGHT, WIDTH, render_day_image
from app.services.share_preview import SharedDay
from tests.fakes import FakeRuzClient
from tests.test_share_preview import GROUPS, LESSONS

GROUP = SearchItem(id=101, type=EntityType.group, name="А-06м-26")


def _size(png: bytes) -> tuple[int, int]:
    return Image.open(BytesIO(png)).size


def _lesson(index: int) -> Lesson:
    return Lesson(
        id=str(index),
        start=time(8 + index, 0),
        finish=time(9 + index, 30),
        subject="Теоретические основы электротехники и электроники, часть " * 3,
        type=LessonType.lecture,
    )


def test_every_day_renders_at_open_graph_size() -> None:
    today = date(2026, 9, 25)
    for lessons in ([], [_lesson(0)], [_lesson(index) for index in range(9)]):
        day = ScheduleDay(date=date(2026, 9, 2), weekday=3, lessons=lessons)
        assert _size(render_day_image(SharedDay(GROUP, day), today)) == (WIDTH, HEIGHT)


def test_share_image_endpoint() -> None:
    async def fake_service() -> PublicScheduleService:
        return PublicScheduleService(FakeRuzClient(GROUPS, LESSONS), MemoryCache())

    app.dependency_overrides[service] = fake_service
    try:
        client = TestClient(app)
        image = client.get("/api/v1/share/A-06m-26/02-09-2026.png")
        missing = client.get("/api/v1/share/A-99/02-09-2026.png")
        bad_date = client.get("/api/v1/share/A-06m-26/31-02-2026.png")
    finally:
        app.dependency_overrides.clear()

    assert image.status_code == 200
    assert image.headers["content-type"] == "image/png"
    assert image.headers["cache-control"].startswith("public, max-age=")
    assert _size(image.content) == (WIDTH, HEIGHT)
    assert missing.status_code == 404
    assert bad_date.status_code == 404
