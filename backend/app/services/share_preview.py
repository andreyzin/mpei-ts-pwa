"""Link previews for `/<group>/<date>`: the day's lessons as title and description.

Messengers read Open Graph tags without running the client, so the preview is
assembled here from the same normalized schedule the client gets.
"""

import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from urllib.parse import quote

from app.schemas.common import Lesson, LessonStatus, LessonType, ScheduleDay, SearchItem
from app.services.public_service import PublicScheduleService

# Moscow has had no DST since 2014; a fixed offset avoids depending on tzdata.
MOSCOW = timezone(timedelta(hours=3), "MSK")

_SHARE_DATE = re.compile(r"(\d{1,2})-(\d{1,2})(?:-(\d{2}|\d{4}))?")
_WEEKDAYS = ("понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье")
_MONTHS = (
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
)
_LESSON_TYPES = {
    LessonType.lecture: "Лекция",
    LessonType.practice: "Практика",
    LessonType.lab: "Лабораторная",
    LessonType.seminar: "Семинар",
    LessonType.exam: "Экзамен",
    LessonType.credit: "Зачёт",
    LessonType.consultation: "Консультация",
}


class SharePreviewNotFound(LookupError):
    pass


@dataclass(frozen=True)
class SharedDay:
    group: SearchItem
    day: ScheduleDay


@dataclass(frozen=True)
class SharePreview:
    title: str
    description: str
    app_url: str
    image_path: str | None = None


def moscow_today() -> date:
    return datetime.now(MOSCOW).date()


def parse_share_date(raw: str | None, today: date) -> date | None:
    """Reads `d-m`, `d-m-yy` and `d-m-yyyy`; a missing date means today.

    Without a year the date is in the current year. Returns None for anything
    that is not a real calendar date.
    """
    if raw is None:
        return today
    match = _SHARE_DATE.fullmatch(raw)
    if match is None:
        return None
    day, month, year = match.groups()
    full_year = today.year if year is None else int(year) + (2000 if len(year) == 2 else 0)
    try:
        return date(full_year, int(month), int(day))
    except ValueError:
        return None


def format_share_date(value: date) -> str:
    """The `?date=` format of RUZ links, which the client reads."""
    return value.strftime("%d-%m-%Y")


def day_title(value: date, today: date) -> str:
    title = f"{_WEEKDAYS[value.weekday()]}, {value.day} {_MONTHS[value.month - 1]}"
    return title if value.year == today.year else f"{title} {value.year}"


def lesson_kind(lesson: Lesson) -> str:
    return _LESSON_TYPES.get(lesson.type) or lesson.raw_type or "Занятие"


def lessons_in_order(day: ScheduleDay) -> list[Lesson]:
    return sorted(day.lessons, key=lambda lesson: lesson.start)


def _lesson_line(lesson: Lesson) -> str:
    parts = [f"{lesson.start:%H:%M}–{lesson.finish:%H:%M}", lesson.subject, lesson_kind(lesson)]
    if lesson.room and lesson.room.name:
        parts.append(lesson.room.name)
    line = " · ".join(parts)
    return f"Отменена: {line}" if lesson.status == LessonStatus.cancelled else line


def describe_day(shared: SharedDay, today: date) -> SharePreview:
    lessons = lessons_in_order(shared.day)
    return SharePreview(
        title=f"{shared.group.name} — {day_title(shared.day.date, today)}",
        description="\n".join(map(_lesson_line, lessons)) if lessons else "Пар нет",
        app_url=f"/?group={shared.group.id}&date={format_share_date(shared.day.date)}",
        image_path=share_image_path(shared),
    )


def share_image_path(shared: SharedDay) -> str:
    """Canonical name and full date, so every spelling of a link shares one image URL."""
    group = quote(shared.group.name, safe="")
    return f"/api/v1/share/{group}/{format_share_date(shared.day.date)}.png"


async def load_shared_day(
    service: PublicScheduleService, group_name: str, raw_date: str | None, today: date
) -> SharedDay:
    """Raises SharePreviewNotFound for an unknown group or an invalid date."""
    day = parse_share_date(raw_date, today)
    if day is None:
        raise SharePreviewNotFound("invalid date")
    group = await service.find_group(group_name)
    if group is None:
        raise SharePreviewNotFound("unknown group")
    schedule = await service.schedule(group.type, group.id, group.name, day, day, "ru")
    return SharedDay(group, schedule.days[0])
