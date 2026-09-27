"""Turning what a user typed in the private chat into one group."""

from dataclasses import dataclass

from app.schedule_api import Group, ScheduleApi


@dataclass(frozen=True)
class Found:
    group: Group


@dataclass(frozen=True)
class Candidates:
    groups: list[Group]


@dataclass(frozen=True)
class NotFound:
    pass


GroupChoice = Found | Candidates | NotFound


async def choose_group(text: str, api: ScheduleApi) -> GroupChoice:
    """Exact name first; otherwise the closest names to pick from."""
    group = await api.find_group(text)
    if group is not None:
        return Found(group)
    candidates = await api.search_groups(text)
    return Candidates(candidates) if candidates else NotFound()
