import pytest

from app.config import Settings


def settings(**values: str) -> Settings:
    return Settings(telegram_bot_token="1:token", **values)  # type: ignore[arg-type]


@pytest.mark.parametrize("base_url", [None, "", "http://localhost:8080", "http://127.0.0.1"])
def test_local_addresses_poll(base_url: str | None) -> None:
    assert not settings(webhook_base_url=base_url).use_webhook  # type: ignore[arg-type]


def test_https_address_uses_a_webhook() -> None:
    config = settings(webhook_base_url="https://bot.example/", webhook_secret="s")

    assert config.use_webhook
    assert config.webhook_url == "https://bot.example/telegram/webhook"


def test_webhook_without_a_secret_is_refused() -> None:
    with pytest.raises(ValueError):
        settings(webhook_base_url="https://bot.example")
