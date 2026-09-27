from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Read from environment variables of the same name, case-insensitive."""

    ruz_base_url: str = "http://ts.mpei.ru"
    ruz_timeout_seconds: float = Field(default=10.0, gt=0)
    cache_ttl_seconds: int = Field(default=900, ge=0)
    rate_limit_per_minute: int = Field(default=60, ge=1)
    # Services of this deployment (the Telegram bot) send it as X-Internal-Token
    # and are not rate limited: one bot address stands for all of its users.
    internal_api_token: SecretStr | None = None

    # Feature suggestions go to this chat through the Telegram bot. Without both
    # values the suggestion endpoint answers 503 instead of dropping them.
    telegram_bot_token: SecretStr | None = None
    telegram_api_base: str = "https://api.telegram.org"
    suggestions_chat_id: str | None = None
    suggestions_per_hour: int = Field(default=5, ge=1)


@lru_cache
def get_settings() -> Settings:
    return Settings()
