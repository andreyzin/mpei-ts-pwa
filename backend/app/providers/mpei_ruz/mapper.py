from datetime import date, datetime, time, timedelta
from typing import Any

from app.schemas.common import (
    EntityType,
    Lesson,
    LessonStatus,
    LessonType,
    PersonRef,
    RoomRef,
    ScheduleDay,
    ScheduleResponse,
    SearchItem,
)


def _value(item: dict[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        if item.get(key) is not None:
            return item[key]
    return default


def map_search(payload: Any, entity_type: EntityType) -> list[SearchItem]:
    rows = (
        payload
        if isinstance(payload, list)
        else payload.get("data", [])
        if isinstance(payload, dict)
        else []
    )
    result = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        raw_id = _value(row, "id", "oid", "value")
        if raw_id is None:
            continue
        result.append(
            SearchItem(
                id=int(raw_id),
                type=entity_type,
                name=str(_value(row, "name", "title", "label", default="")),
                code=_value(row, "code"),
                faculty={"name": row.get("description")}
                if entity_type == EntityType.group
                else None,
                building={"name": row.get("description")}
                if entity_type == EntityType.room
                else None,
            )
        )
    return result


def _parse_time(value: Any, fallback: str) -> time:
    try:
        return time.fromisoformat(str(value))
    except (TypeError, ValueError):
        return time.fromisoformat(fallback)


def _lesson(row: dict[str, Any], index: int) -> Lesson:
    raw_type = str(_value(row, "type", "lesson_type", "kindOfWork", default="other"))
    normalized = raw_type.lower()
    type_aliases = {
        "лекция": LessonType.lecture,
        "практическое": LessonType.practice,
        "лаборатор": LessonType.lab,
        "семинар": LessonType.seminar,
        "экзамен": LessonType.exam,
        "зачет": LessonType.credit,
        "консультац": LessonType.consultation,
    }
    lesson_type = next(
        (value for marker, value in type_aliases.items() if marker in normalized),
        next((value for value in LessonType if value.value in normalized), LessonType.other),
    )
    lecturer_rows = _value(row, "teachers", "persons", "listOfLecturers", default=[]) or []
    teachers = [
        PersonRef(
            id=int(_value(t, "id", "oid", "lecturerOid", default=0)),
            name=str(_value(t, "name", "title", "lecturer_title", default="")),
        )
        for t in lecturer_rows
        if isinstance(t, dict)
    ]
    room_value = _value(row, "room", "auditorium")
    room = (
        RoomRef(
            id=int(_value(row, "auditoriumOid", default=0)),
            name=str(room_value),
            building=_value(row, "building"),
        )
        if isinstance(room_value, str)
        else RoomRef(
            id=int(_value(room_value, "id", "oid", default=0)),
            name=str(_value(room_value, "name", "title", default="")),
        )
        if isinstance(room_value, dict)
        else None
    )
    group_rows = _value(row, "groups", "listGroups", default=[]) or []
    groups = [
        SearchItem(
            id=int(_value(group, "id", "oid", "groupOid", default=0)),
            type=EntityType.group,
            name=str(_value(group, "name", "group", "label", default="")),
        )
        for group in group_rows
        if isinstance(group, dict)
    ]
    status_value = str(_value(row, "status", default="scheduled"))
    status = (
        LessonStatus.cancelled
        if "cancel" in status_value.lower()
        else LessonStatus.moved
        if "move" in status_value.lower()
        else LessonStatus.scheduled
    )
    return Lesson(
        id=str(_value(row, "id", "oid", "lessonOid", default=f"ruz-{index}")),
        start=_parse_time(_value(row, "start", "start_time", "beginLesson"), "00:00"),
        finish=_parse_time(_value(row, "finish", "end", "end_time", "endLesson"), "00:00"),
        lesson_number=_value(row, "lesson_number", "number", "lessonNumberStart"),
        subject=str(_value(row, "subject", "discipline", "title", default="")),
        type=lesson_type,
        raw_type=raw_type,
        teachers=teachers,
        room=room,
        groups=groups,
        subgroup=(int(_value(row, "subgroup", "subGroupOid")) or None),
        status=status,
        online_url=_value(row, "online_url", "url1", "url2"),
    )


def map_schedule(
    payload: Any,
    entity_type: EntityType,
    entity_id: int,
    name: str,
    date_from: date,
    date_to: date,
    cached: bool = False,
) -> ScheduleResponse:
    rows = payload.get("data", payload) if isinstance(payload, dict) else payload
    rows = (
        rows
        if isinstance(rows, list)
        else rows.get("schedule", [])
        if isinstance(rows, dict)
        else []
    )
    by_date: dict[date, list[Lesson]] = {}
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            continue
        raw_date = _value(row, "date", "day")
        try:
            lesson_date = date.fromisoformat(str(raw_date).replace(".", "-"))
        except (TypeError, ValueError):
            continue
        by_date.setdefault(lesson_date, []).append(_lesson(row, index))
    days = [
        ScheduleDay(date=current, weekday=current.isoweekday(), lessons=by_date.get(current, []))
        for current in (
            date_from + timedelta(days=i) for i in range((date_to - date_from).days + 1)
        )
    ]
    return ScheduleResponse.model_validate(
        {
            "subject": {"type": entity_type, "id": entity_id, "name": name},
            "period": {"from": date_from, "to": date_to},
            "days": days,
            "meta": {"cached": cached, "fetched_at": datetime.now().astimezone()},
        }
    )
