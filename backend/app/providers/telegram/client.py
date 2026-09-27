import httpx


class TelegramError(RuntimeError):
    pass


class TelegramClient:
    """The one Bot API call the backend needs; the bot service owns the rest."""

    def __init__(self, client: httpx.AsyncClient, token: str, api_base: str) -> None:
        self.client = client
        self.url = f"{api_base.rstrip('/')}/bot{token}/sendMessage"

    async def send_message(self, chat_id: str, html: str) -> None:
        try:
            response = await self.client.post(
                self.url,
                json={
                    "chat_id": chat_id,
                    "text": html,
                    "parse_mode": "HTML",
                    "link_preview_options": {"is_disabled": True},
                },
            )
        except httpx.HTTPError as error:
            # The URL carries the token; keep it out of the message.
            raise TelegramError(type(error).__name__) from None
        if response.is_error:
            raise TelegramError(f"sendMessage returned {response.status_code}")
