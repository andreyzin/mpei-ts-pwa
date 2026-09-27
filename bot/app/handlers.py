"""Telegram updates in, calls into the modules that decide what to say."""

from html import escape

from aiogram import Bot, F, Router
from aiogram.filters import Command, CommandStart
from aiogram.filters.callback_data import CallbackData
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    InlineQuery,
    Message,
)

from app.config import Settings
from app.group_choice import Candidates, Found, choose_group
from app.inline import answer_inline_query
from app.schedule_api import Group, ScheduleApi, ScheduleApiError
from app.storage import GroupRepository
from app.texts import moscow_today

router = Router()
# Setting a group is a conversation with the bot; in groups it only works inline.
router.message.filter(F.chat.type == "private")

# Group codes are short; anything longer is not worth a request to the API.
MAX_GROUP_QUERY = 40


class PickGroup(CallbackData, prefix="group"):
    id: int
    name: str


def _try_inline_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Отправить расписание в чат", switch_inline_query="")]
        ]
    )


async def _username(bot: Bot) -> str:
    return (await bot.me()).username or "bot"


@router.message(CommandStart())
@router.message(Command("group"))
async def start(message: Message, bot: Bot, repository: GroupRepository) -> None:
    if message.from_user is None:
        return
    saved = await repository.get(message.from_user.id)
    username = await _username(bot)
    if saved:
        await message.answer(
            f"Твоя группа: <b>{escape(saved.name)}</b>. Чтобы сменить, пришли другое название.\n\n"
            f"В любом чате набери @{username} — появится список дат."
        )
        return
    await message.answer(
        "Пришли название своей группы, например <b>А-06м-26</b>. Можно латиницей: A-06m-26.\n\n"
        f"Потом в любом чате набери @{username} и выбери дату — в чат уйдёт расписание."
    )


async def _save(user_id: int, group: Group, repository: GroupRepository, bot: Bot) -> str:
    await repository.save(user_id, group)
    return (
        f"Сохранил: <b>{escape(group.name)}</b>.\n\n"
        f"Теперь в любом чате набери @{await _username(bot)} и выбери дату."
    )


@router.message(F.text & ~F.text.startswith("/"))
async def group_name(
    message: Message, bot: Bot, repository: GroupRepository, api: ScheduleApi
) -> None:
    if message.from_user is None or message.text is None:
        return
    text = message.text.strip()
    if len(text) > MAX_GROUP_QUERY:
        await message.answer("Не похоже на название группы. Пример: А-06м-26.")
        return
    try:
        choice = await choose_group(text, api)
    except ScheduleApiError:
        await message.answer("Расписание МЭИ сейчас не отвечает. Попробуй через пару минут.")
        return
    if isinstance(choice, Found):
        reply = await _save(message.from_user.id, choice.group, repository, bot)
        await message.answer(reply, reply_markup=_try_inline_keyboard())
    elif isinstance(choice, Candidates):
        keyboard = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text=group.name,
                        callback_data=PickGroup(id=group.id, name=group.name).pack(),
                    )
                ]
                for group in choice.groups
            ]
        )
        await message.answer("Точно такой группы нет. Может, одна из этих?", reply_markup=keyboard)
    else:
        await message.answer("Не нашёл такую группу. Проверь написание, например А-06м-26.")


@router.callback_query(PickGroup.filter())
async def pick_group(
    callback: CallbackQuery, callback_data: PickGroup, bot: Bot, repository: GroupRepository
) -> None:
    group = Group(id=callback_data.id, name=callback_data.name)
    reply = await _save(callback.from_user.id, group, repository, bot)
    if callback.message is not None:
        await bot.edit_message_text(
            reply,
            chat_id=callback.message.chat.id,
            message_id=callback.message.message_id,
            reply_markup=_try_inline_keyboard(),
        )
    await callback.answer()


@router.inline_query()
async def inline_dates(
    inline_query: InlineQuery, repository: GroupRepository, api: ScheduleApi, settings: Settings
) -> None:
    answer = await answer_inline_query(
        inline_query.query,
        inline_query.from_user.id,
        repository,
        api,
        moscow_today(),
        settings.app_url,
    )
    await inline_query.answer(
        answer.results,  # type: ignore[arg-type]  # a list of one member of the union
        cache_time=answer.cache_time,
        is_personal=True,
        button=answer.button,
    )
