import pytest

from app.config import Settings


def test_settings_come_from_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RUZ_BASE_URL", "http://ruz.test")
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "5")

    settings = Settings()

    assert settings.ruz_base_url == "http://ruz.test"
    assert settings.rate_limit_per_minute == 5


def test_invalid_setting_fails_at_startup(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "0")

    with pytest.raises(ValueError):
        Settings()
