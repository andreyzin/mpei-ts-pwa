from datetime import date

import pytest

from app.schedule_api import Day, RoomRef
from app.texts import day_message, day_summary, lessons_word, relative_day_title
from tests.fakes import GROUP, lesson

TODAY = date(2026, 9, 2)


@pytest.mark.parametrize(
    ("count", "word"),
    [(1, "пара"), (2, "пары"), (4, "пары"), (5, "пар"), (11, "пар"), (12, "пар"), (21, "пара")],
)
def test_lessons_word_agrees_with_the_number(count: int, word: str) -> None:
    assert lessons_word(count) == word


def test_nearest_days_are_named_relative_to_today() -> None:
    assert relative_day_title(TODAY, TODAY) == "Сегодня · среда, 2 сентября"
    assert relative_day_title(date(2026, 9, 3), TODAY) == "Завтра · четверг, 3 сентября"
    assert relative_day_title(date(2026, 9, 4), TODAY) == "Пятница, 4 сентября"


def test_summary_counts_lessons_that_take_place() -> None:
    day = Day(
        date=TODAY,
        lessons=[
            lesson("13:45", "15:20", "Физика"),
            lesson("09:20", "10:55", "Математика"),
            lesson("15:35", "17:10", "Химия", status="cancelled"),
        ],
    )

    assert day_summary(day) == "2 пары · 09:20–15:20"
    assert day_summary(Day(date=TODAY, lessons=[])) == "Пар нет"


def test_day_message_lists_lessons_in_order_and_links_to_the_app() -> None:
    day = Day(
        date=TODAY,
        lessons=[
            lesson("11:10", "12:45", "Физика <лаб>", type="lab", room=RoomRef(name="Б-300")),
            lesson("09:20", "10:55", "Математика", room=RoomRef(name="М-611")),
            lesson("13:45", "15:20", "Химия", status="cancelled"),
        ],
    )

    assert day_message(GROUP, day, "https://schedule.example/") == (
        "<b>А-06м-26</b> · среда, 2 сентября\n\n"
        "<b>09:20–10:55</b> Математика\nЛекция · М-611\n\n"
        "<b>11:10–12:45</b> Физика &lt;лаб&gt;\nЛабораторная · Б-300\n\n"
        "<b>13:45–15:20</b> <s>Химия</s>\nОтменена · Лекция\n\n"
        '<a href="https://schedule.example/%D0%90-06%D0%BC-26/02-09-2026">Открыть в приложении</a>'
    )


def test_free_day_without_app_link() -> None:
    assert day_message(GROUP, Day(date=TODAY, lessons=[]), None) == (
        "<b>А-06м-26</b> · среда, 2 сентября\n\nПар нет"
    )
