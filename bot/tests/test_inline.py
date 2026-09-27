import asyncio
from datetime import date

from app.inline import DAYS_AHEAD, SETUP_PARAMETER, answer_inline_query
from app.schedule_api import Group
from tests.fakes import GROUP, FakeApi, FakeRepository, lesson, week

TODAY = date(2026, 9, 2)
USER = 7
OTHER = Group(id=202, name="Э-01-24")


def answer(query: str, repository: FakeRepository, api: FakeApi):
    return asyncio.run(
        answer_inline_query(query, USER, repository, api, TODAY, "https://schedule.example")
    )


def test_saved_group_lists_the_coming_week() -> None:
    days = week(TODAY, {TODAY: [lesson("09:20", "10:55", "Математика")]})
    api = FakeApi(days=days)

    result = answer("", FakeRepository({USER: GROUP}), api)

    assert api.day_requests == [(101, TODAY, date(2026, 9, 8))]
    assert len(result.results) == DAYS_AHEAD
    first = result.results[0]
    assert first.title == "Сегодня · среда, 2 сентября"
    assert first.description == "А-06м-26 · 1 пара · 09:20–10:55"
    assert first.input_message_content.message_text.startswith("<b>А-06м-26</b> · среда")
    assert result.results[1].description == "А-06м-26 · Пар нет"
    assert len({item.id for item in result.results}) == DAYS_AHEAD


def test_typed_group_wins_over_the_saved_one() -> None:
    api = FakeApi(groups=[GROUP, OTHER], days=week(TODAY, {}))

    answer("Э-01-24", FakeRepository({USER: GROUP}), api)

    assert api.day_requests[0][0] == 202


def test_latin_group_name_is_found() -> None:
    api = FakeApi(days=week(TODAY, {}))

    result = answer("A-06m-26", FakeRepository(), api)

    assert result.results and api.day_requests[0][0] == 101


def test_without_a_group_the_user_is_sent_to_the_bot() -> None:
    result = answer("", FakeRepository(), FakeApi())

    assert result.results == []
    assert result.button is not None
    assert result.button.start_parameter == SETUP_PARAMETER
    assert result.button.text == "Выбрать группу"
    assert result.cache_time == 0


def test_unknown_typed_group() -> None:
    result = answer("Я-99", FakeRepository({USER: GROUP}), FakeApi())

    assert result.results == []
    assert result.button is not None
    assert result.button.text == "Группа не найдена — выбрать в боте"


def test_unavailable_schedule_is_not_cached() -> None:
    result = answer("", FakeRepository({USER: GROUP}), FakeApi(broken=True))

    assert result.results == []
    assert result.cache_time == 0
    assert result.button is not None
    assert result.button.text == "Расписание сейчас недоступно"
