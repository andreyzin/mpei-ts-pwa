from functools import lru_cache

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Read from environment variables of the same name, case-insensitive."""

    telegram_bot_token: SecretStr
    database_url: str = "postgresql://postgres:postgres@localhost:5432/bot"
    schedule_api_url: str = "http://localhost:8000"
    internal_api_token: SecretStr | None = None
    # Public address of the web app; lesson messages link to the day there.
    app_url: str | None = None

    # A local Bot API server (telegram-bot-api), e.g. http://localhost:8081.
    telegram_api_base: str | None = None
    # https://... switches from long polling to a webhook at this address.
    # Anything else, empty or http://localhost, keeps polling.
    webhook_base_url: str | None = None
    webhook_path: str = "/telegram/webhook"
    webhook_secret: SecretStr | None = None
    webhook_port: int = Field(default=8080, ge=1, le=65535)

    @property
    def use_webhook(self) -> bool:
        return (self.webhook_base_url or "").startswith("https://")

    @property
    def webhook_url(self) -> str:
        return f"{(self.webhook_base_url or '').rstrip('/')}{self.webhook_path}"

    @model_validator(mode="after")
    def _webhook_needs_a_secret(self) -> "Settings":
        # Without it anyone who finds the URL can post updates as Telegram.
        if self.use_webhook and self.webhook_secret is None:
            raise ValueError("WEBHOOK_SECRET is required with an https WEBHOOK_BASE_URL")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # the token comes from the environment
