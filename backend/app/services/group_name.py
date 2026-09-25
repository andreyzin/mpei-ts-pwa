"""Latin spelling of MPEI group codes: `A-06m-26` means `А-06м-26`.

People type group codes on an English layout and put them into links, while
RUZ only knows the Cyrillic spelling. The map is phonetic, with the choices a
group code needs where the letter is ambiguous: `e` is `э` (ЭР-, ИЭ-), not `е`.
"""

import re

_DIGRAPHS = {"zh": "ж", "ch": "ч", "sh": "ш", "yu": "ю", "ya": "я"}
_LETTERS = {
    "a": "а",
    "b": "б",
    "c": "ц",
    "d": "д",
    "e": "э",
    "f": "ф",
    "g": "г",
    "h": "х",
    "i": "и",
    "j": "й",
    "k": "к",
    "l": "л",
    "m": "м",
    "n": "н",
    "o": "о",
    "p": "п",
    "r": "р",
    "s": "с",
    "t": "т",
    "u": "у",
    "v": "в",
    "w": "в",
    "x": "х",
    "y": "ы",
    "z": "з",
}
_LATIN = re.compile("|".join([*_DIGRAPHS, *_LETTERS]), re.IGNORECASE)


def _replace(match: re.Match[str]) -> str:
    latin = match.group()
    cyrillic = _DIGRAPHS.get(latin.lower()) or _LETTERS[latin.lower()]
    return cyrillic.upper() if latin[0].isupper() else cyrillic


def to_cyrillic(group_name: str) -> str:
    """Replaces Latin letters keeping their case; everything else is untouched."""
    return _LATIN.sub(_replace, group_name)


def same_group_name(a: str, b: str) -> bool:
    return to_cyrillic(a).strip().casefold() == to_cyrillic(b).strip().casefold()
