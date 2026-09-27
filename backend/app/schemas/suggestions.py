from pydantic import BaseModel, ConfigDict, Field


class SuggestionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    text: str = Field(min_length=3, max_length=2000)
    contact: str | None = Field(default=None, max_length=200)
