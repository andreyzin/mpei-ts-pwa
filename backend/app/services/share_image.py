"""The picture messengers show for a share link: one day of a group's lessons.

1200×630 is the Open Graph size that Telegram, VK and others show uncropped.
Colors are the app's light theme tokens from `frontend/src/index.css`.
"""

from datetime import date
from functools import cache
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from app.schemas.common import Lesson, LessonStatus
from app.services.share_preview import SharedDay, day_title, lesson_kind, lessons_in_order

WIDTH, HEIGHT = 1200, 630
_PADDING = 64
_TIME_COLUMN = 150
_ROW_HEIGHT = 72
_MORE_HEIGHT = 44
_LIST_TOP = 196
_LIST_HEIGHT = HEIGHT - _LIST_TOP - 24

_BACKGROUND = "#eef5fa"
_TEXT = "#172b3d"
_MUTED = "#6b7d8d"
_LINE = "#d7e7f2"
_ACCENT = "#3d78b8"
_DANGER = "#b84c5a"

_FONTS = Path(__file__).resolve().parent.parent / "assets" / "fonts"


@cache
def _font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(_FONTS / f"GolosText-{weight}.ttf"), size)


def _fit(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, width: int) -> str:
    """Cuts the text with an ellipsis so it never runs into the edge."""
    if draw.textlength(text, font=font) <= width:
        return text
    while text and draw.textlength(f"{text}…", font=font) > width:
        text = text[:-1]
    return f"{text.rstrip()}…"


def _lesson_meta(lesson: Lesson) -> str:
    parts = [lesson_kind(lesson)]
    if lesson.room and lesson.room.name:
        parts.append(lesson.room.name)
    return " · ".join(parts)


def _draw_lesson(draw: ImageDraw.ImageDraw, lesson: Lesson, top: int) -> None:
    cancelled = lesson.status == LessonStatus.cancelled
    content_left = _PADDING + _TIME_COLUMN
    content_width = WIDTH - _PADDING - content_left

    draw.text(
        (_PADDING, top + 10), f"{lesson.start:%H:%M}", font=_font("SemiBold", 30), fill=_ACCENT
    )
    draw.text(
        (_PADDING, top + 44), f"{lesson.finish:%H:%M}", font=_font("Regular", 22), fill=_MUTED
    )

    subject_font = _font("SemiBold", 30)
    subject = _fit(draw, lesson.subject, subject_font, content_width)
    draw.text(
        (content_left, top + 10), subject, font=subject_font, fill=_MUTED if cancelled else _TEXT
    )
    if cancelled:
        strike_y = top + 10 + 20
        strike_end = content_left + draw.textlength(subject, font=subject_font)
        draw.line((content_left, strike_y, strike_end, strike_y), fill=_MUTED, width=2)

    meta = f"Отменена · {_lesson_meta(lesson)}" if cancelled else _lesson_meta(lesson)
    meta_font = _font("Regular", 22)
    draw.text(
        (content_left, top + 44),
        _fit(draw, meta, meta_font, content_width),
        font=meta_font,
        fill=_DANGER if cancelled else _MUTED,
    )


def render_day_image(shared: SharedDay, today: date) -> bytes:
    image = Image.new("RGB", (WIDTH, HEIGHT), _BACKGROUND)
    draw = ImageDraw.Draw(image)
    right = WIDTH - _PADDING

    draw.text((_PADDING, 52), "РАСПИСАНИЕ МЭИ", font=_font("SemiBold", 22), fill=_ACCENT)
    # Group and day share a baseline; the day is kept whole, the group gives way.
    title = day_title(shared.day.date, today)
    title_font = _font("Regular", 30)
    title = title[0].upper() + title[1:]
    draw.text((right, 150), title, font=title_font, fill=_MUTED, anchor="rs")
    group_font = _font("SemiBold", 68)
    group_width = right - _PADDING - int(draw.textlength(title, font=title_font)) - 32
    group = _fit(draw, shared.group.name, group_font, group_width)
    draw.text((_PADDING, 150), group, font=group_font, fill=_TEXT, anchor="ls")
    draw.line((_PADDING, _LIST_TOP - 16, right, _LIST_TOP - 16), fill=_LINE, width=2)

    lessons = lessons_in_order(shared.day)
    if not lessons:
        draw.text((_PADDING, _LIST_TOP + 16), "Пар нет", font=_font("SemiBold", 44), fill=_MUTED)
        return _png(image)

    if len(lessons) * _ROW_HEIGHT <= _LIST_HEIGHT:
        shown = lessons
    else:
        shown = lessons[: (_LIST_HEIGHT - _MORE_HEIGHT) // _ROW_HEIGHT]
    for index, lesson in enumerate(shown):
        top = _LIST_TOP + index * _ROW_HEIGHT
        if index:
            draw.line((_PADDING, top, right, top), fill=_LINE, width=1)
        _draw_lesson(draw, lesson, top)
    if len(shown) < len(lessons):
        top = _LIST_TOP + len(shown) * _ROW_HEIGHT
        draw.line((_PADDING, top, right, top), fill=_LINE, width=1)
        more = f"Ещё пар: {len(lessons) - len(shown)}"
        draw.text((_PADDING + _TIME_COLUMN, top + 12), more, font=_font("Regular", 26), fill=_MUTED)
    return _png(image)


def _png(image: Image.Image) -> bytes:
    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()
