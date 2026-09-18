from datetime import date, datetime, time
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class EntityType(StrEnum):
    group = "group"
    teacher = "teacher"
    room = "room"


class SearchItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int
    type: EntityType
    name: str
    code: str | None = None
    faculty: dict[str, object] | None = None
    building: dict[str, object] | None = None


class Pagination(BaseModel):
    limit: int
    offset: int
    total: int
    has_more: bool


class SearchResponse(BaseModel):
    items: list[SearchItem]
    pagination: Pagination


class PersonRef(BaseModel):
    id: int
    name: str


class RoomRef(BaseModel):
    id: int
    name: str
    building: str | None = None


class LessonType(StrEnum):
    lecture = "lecture"
    practice = "practice"
    lab = "lab"
    seminar = "seminar"
    exam = "exam"
    credit = "credit"
    consultation = "consultation"
    other = "other"


class LessonStatus(StrEnum):
    scheduled = "scheduled"
    cancelled = "cancelled"
    moved = "moved"


class Lesson(BaseModel):
    id: str
    start: time
    finish: time
    lesson_number: int | None = Field(default=None, ge=1)
    subject: str
    type: LessonType
    raw_type: str | None = None
    teachers: list[PersonRef] = []
    room: RoomRef | None = None
    groups: list[SearchItem] = []
    subgroup: int | None = Field(default=None, ge=1)
    status: LessonStatus = LessonStatus.scheduled
    online_url: str | None = None


class ScheduleDay(BaseModel):
    date: date
    weekday: int = Field(ge=1, le=7)
    lessons: list[Lesson]


class SchedulePeriod(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_: date = Field(alias="from")
    to: date
    timezone: str = "Europe/Moscow"


class ScheduleSubject(BaseModel):
    type: EntityType
    id: int
    name: str


class ScheduleMeta(BaseModel):
    source: str = "mpei_ruz"
    cached: bool
    stale: bool = False
    fetched_at: datetime


class ScheduleResponse(BaseModel):
    subject: ScheduleSubject
    period: SchedulePeriod
    days: list[ScheduleDay]
    meta: ScheduleMeta
