import asyncio
from datetime import date

import httpx
import pytest

from app.schedule_api import Group, ScheduleApi, ScheduleApiError


def run(handler, action):
    async def go():
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(base_url="http://backend", transport=transport) as client:
            return await action(ScheduleApi(client))

    return asyncio.run(go())


def test_lookup_is_cached_including_misses() -> None:
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.params["name"])
        if request.url.params["name"] == "A-06m-26":
            return httpx.Response(200, json={"id": 101, "name": "А-06м-26", "type": "group"})
        return httpx.Response(404, json={"detail": "Group not found"})

    async def action(api: ScheduleApi):
        return [
            await api.find_group("A-06m-26"),
            await api.find_group(" a-06m-26 "),
            await api.find_group("Я-99"),
            await api.find_group("Я-99"),
        ]

    found, again, missing, missing_again = run(handler, action)

    assert found == again == Group(id=101, name="А-06м-26")
    assert missing is None and missing_again is None
    assert calls == ["A-06m-26", "Я-99"]


def test_days_come_from_the_group_schedule() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/v1/groups/101/schedule"
        assert dict(request.url.params) == {"from": "2026-09-02", "to": "2026-09-03"}
        return httpx.Response(
            200,
            json={
                "days": [
                    {"date": "2026-09-02", "weekday": 3, "lessons": []},
                    {
                        "date": "2026-09-03",
                        "weekday": 4,
                        "lessons": [
                            {
                                "id": "1",
                                "start": "09:20:00",
                                "finish": "10:55:00",
                                "subject": "Физика",
                                "type": "lab",
                                "room": {"id": 1, "name": "Б-300"},
                                "status": "scheduled",
                            }
                        ],
                    },
                ]
            },
        )

    days = run(handler, lambda api: api.days(101, date(2026, 9, 2), date(2026, 9, 3)))

    assert [day.date for day in days] == [date(2026, 9, 2), date(2026, 9, 3)]
    assert days[1].lessons[0].room.name == "Б-300"


@pytest.mark.parametrize("status", [429, 502])
def test_backend_errors_become_schedule_api_errors(status: int) -> None:
    with pytest.raises(ScheduleApiError):
        run(
            lambda request: httpx.Response(status),
            lambda api: api.days(101, date(2026, 9, 2), date(2026, 9, 2)),
        )


def test_unreachable_backend_is_a_schedule_api_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("refused")

    with pytest.raises(ScheduleApiError):
        run(handler, lambda api: api.find_group("A-06m-26"))
