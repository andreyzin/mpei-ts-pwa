from datetime import date, timedelta

from app.schedule_api import Day, Group, Lesson, ScheduleApiError

GROUP = Group(id=101, name="А-06м-26")


def lesson(start: str, finish: str, subject: str, **fields: object) -> Lesson:
    return Lesson.model_validate(
        {"start": start, "finish": finish, "subject": subject, "type": "lecture", **fields}
    )


def week(start: date, lessons_by_day: dict[date, list[Lesson]]) -> list[Day]:
    return [
        Day(
            date=start + timedelta(days=offset),
            lessons=lessons_by_day.get(start + timedelta(days=offset), []),
        )
        for offset in range(7)
    ]


class FakeRepository:
    def __init__(self, saved: dict[int, Group] | None = None) -> None:
        self.saved = dict(saved or {})

    async def get(self, user_id: int) -> Group | None:
        return self.saved.get(user_id)

    async def save(self, user_id: int, group: Group) -> None:
        self.saved[user_id] = group


class FakeApi:
    def __init__(
        self,
        groups: list[Group] | None = None,
        days: list[Day] | None = None,
        broken: bool = False,
    ) -> None:
        self.groups = groups or [GROUP]
        self.week = days or []
        self.broken = broken
        self.day_requests: list[tuple[int, date, date]] = []

    async def find_group(self, name: str) -> Group | None:
        if self.broken:
            raise ScheduleApiError("down")
        latin = str.maketrans("AaMm", "АаМм")
        wanted = name.strip().translate(latin).casefold()
        return next((g for g in self.groups if g.name.casefold() == wanted), None)

    async def search_groups(self, query: str, limit: int = 6) -> list[Group]:
        return [g for g in self.groups if query.casefold() in g.name.casefold()][:limit]

    async def days(self, group_id: int, date_from: date, date_to: date) -> list[Day]:
        if self.broken:
            raise ScheduleApiError("down")
        self.day_requests.append((group_id, date_from, date_to))
        return self.week
