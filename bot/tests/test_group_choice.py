import asyncio

from app.group_choice import Candidates, Found, NotFound, choose_group
from app.schedule_api import Group
from tests.fakes import GROUP, FakeApi

NEIGHBOUR = Group(id=102, name="А-06м-25")


def test_exact_name_is_found() -> None:
    assert asyncio.run(choose_group("a-06M-26", FakeApi([GROUP, NEIGHBOUR]))) == Found(GROUP)


def test_partial_name_offers_candidates() -> None:
    choice = asyncio.run(choose_group("А-06м", FakeApi([GROUP, NEIGHBOUR])))

    assert choice == Candidates([GROUP, NEIGHBOUR])


def test_nothing_similar() -> None:
    assert asyncio.run(choose_group("Я-99", FakeApi([GROUP]))) == NotFound()
