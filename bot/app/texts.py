"""Telegram HTML for a day of lessons and the labels of the inline date list."""

from datetime import date, datetime, timedelta, timezone
from html import escape
from urllib.parse import quote

from app.schedule_api import Day, Group, Lesson

# Moscow has had no DST since 2014; a fixed offset avoids depending on tzdata.
MOSCOW = timezone(timedelta(hours=3), "MSK")

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
    "lecture": "Лекция",
    "practice": "Практика",
    "lab": "Лабораторная",
    "seminar": "Семинар",
    "exam": "Экзамен",
    "credit": "Зачёт",
    "consultation": "Консультация",
}


def moscow_today() -> date:
    return datetime.now(MOSCOW).date()


def day_name(value: date) -> str:
    return f"{_WEEKDAYS[value.weekday()]}, {value.day} {_MONTHS[value.month - 1]}"


def relative_day_title(value: date, today: date) -> str:
    """«Сегодня · среда, 2 сентября» for the two nearest days, capitalised name otherwise."""
    name = day_name(value)
    prefix = {0: "Сегодня", 1: "Завтра"}.get((value - today).days)
    return f"{prefix} · {name}" if prefix else name[0].upper() + name[1:]


def lessons_word(count: int) -> str:
    if count % 10 == 1 and count % 100 != 11:
        return "пара"
    if 2 <= count % 10 <= 4 and not 12 <= count % 100 <= 14:
        return "пары"
    return "пар"


def _active(day: Day) -> list[Lesson]:
    return [lesson for lesson in day.lessons if lesson.status != "cancelled"]


def day_summary(day: Day) -> str:
    """Description under a date in the inline list: «3 пары · 09:20–14:20»."""
    lessons = sorted(_active(day), key=lambda lesson: lesson.start)
    if not lessons:
        return "Пар нет"
    return f"{len(lessons)} {lessons_word(len(lessons))} · {lessons[0].start}–{lessons[-1].finish}"


def _lesson_block(lesson: Lesson) -> str:
    kind = _LESSON_TYPES.get(lesson.type) or lesson.raw_type or "Занятие"
    meta = " · ".join([kind, *([lesson.room.name] if lesson.room and lesson.room.name else [])])
    time = f"<b>{lesson.start}–{lesson.finish}</b>"
    if lesson.status == "cancelled":
        return f"{time} <s>{escape(lesson.subject)}</s>\nОтменена · {escape(meta)}"
    return f"{time} {escape(lesson.subject)}\n{escape(meta)}"


def share_url(app_url: str, group: Group, day: date) -> str:
    """The web app's share link, which also previews the day in chats."""
    return f"{app_url.rstrip('/')}/{quote(group.name, safe='')}/{day:%d-%m-%Y}"


def day_message(group: Group, day: Day, app_url: str | None) -> str:
    lines = [f"<b>{escape(group.name)}</b> · {day_name(day.date)}", ""]
    lessons = sorted(day.lessons, key=lambda lesson: lesson.start)
    lines.append("\n\n".join(map(_lesson_block, lessons)) if lessons else "Пар нет")
    if app_url:
        lines += [
            "",
            f'<a href="{escape(share_url(app_url, group, day.date))}">Открыть в приложении</a>',
        ]
    return "\n".join(lines)
