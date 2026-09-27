"""What `@bot` shows in any chat: the next days of a group, each sending its lessons."""

from dataclasses import dataclass
from datetime import date, timedelta

from aiogram.types import (
    InlineQueryResultArticle,
    InlineQueryResultsButton,
    InputTextMessageContent,
    LinkPreviewOptions,
)

from app.schedule_api import Group, ScheduleApi, ScheduleApiError
from app.storage import GroupRepository
from app.texts import day_message, day_summary, relative_day_title

DAYS_AHEAD = 7
SETUP_PARAMETER = "setup"


@dataclass(frozen=True)
class InlineAnswer:
    results: list[InlineQueryResultArticle]
    button: InlineQueryResultsButton | None = None
    # Seconds Telegram may reuse the answer; errors must not stick.
    cache_time: int = 60


def _setup_button(text: str) -> InlineQueryResultsButton:
    return InlineQueryResultsButton(text=text, start_parameter=SETUP_PARAMETER)


async def _target_group(
    query: str, user_id: int, repository: GroupRepository, api: ScheduleApi
) -> Group | None:
    """A group typed after the bot's name wins over the saved one."""
    if query.strip():
        return await api.find_group(query)
    return await repository.get(user_id)


async def answer_inline_query(
    query: str,
    user_id: int,
    repository: GroupRepository,
    api: ScheduleApi,
    today: date,
    app_url: str | None,
) -> InlineAnswer:
    try:
        group = await _target_group(query, user_id, repository, api)
        if group is None:
            text = "Группа не найдена — выбрать в боте" if query.strip() else "Выбрать группу"
            return InlineAnswer([], _setup_button(text), cache_time=0)
        days = await api.days(group.id, today, today + timedelta(days=DAYS_AHEAD - 1))
    except ScheduleApiError:
        return InlineAnswer([], _setup_button("Расписание сейчас недоступно"), cache_time=0)

    results = [
        InlineQueryResultArticle(
            id=f"{group.id}:{day.date.isoformat()}",
            title=f"{relative_day_title(day.date, today)}",
            description=f"{group.name} · {day_summary(day)}",
            input_message_content=InputTextMessageContent(
                message_text=day_message(group, day, app_url),
                parse_mode="HTML",
                link_preview_options=LinkPreviewOptions(is_disabled=True),
            ),
        )
        for day in days
    ]
    return InlineAnswer(results)
