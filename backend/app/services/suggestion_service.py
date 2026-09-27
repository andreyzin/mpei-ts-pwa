from html import escape

from app.providers.telegram.client import TelegramClient
from app.schemas.suggestions import SuggestionRequest


def format_suggestion(suggestion: SuggestionRequest) -> str:
    """Telegram HTML; everything the user typed is escaped."""
    lines = ["<b>Предложение</b>", "", escape(suggestion.text)]
    if suggestion.contact:
        lines += ["", f"Контакт: {escape(suggestion.contact)}"]
    return "\n".join(lines)


class SuggestionService:
    def __init__(self, telegram: TelegramClient, chat_id: str) -> None:
        self.telegram = telegram
        self.chat_id = chat_id

    async def submit(self, suggestion: SuggestionRequest) -> None:
        await self.telegram.send_message(self.chat_id, format_suggestion(suggestion))
