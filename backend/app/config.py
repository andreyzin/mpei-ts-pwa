from functools import lru_cache

from pydantic import BaseModel, Field


class Settings(BaseModel):
    ruz_base_url: str = "http://ts.mpei.ru"
    ruz_timeout_seconds: float = Field(default=10.0, gt=0)
    cache_ttl_seconds: int = Field(default=900, ge=0)
    rate_limit_per_minute: int = Field(default=60, ge=1)


@lru_cache
def get_settings() -> Settings:
    return Settings()
