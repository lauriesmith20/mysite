"""The shirt game's source data and how a day's puzzle is picked from it.

`shirt_data.json` maps each season ("2015-16") to its Premier League clubs, each with its squad as
`[shirt number, name, matchday appearances]` and its kits (home/away/third) as colours plus the names of
the Wikimedia Commons pattern images for each part. It was built once from the Transfermarkt datasets (CC0)
and Wikipedia's season pages, and only includes clubs that had kit data.
"""
import datetime
import functools
import hashlib
import json
import pathlib
import random
import urllib.parse
from dataclasses import dataclass
from typing import Any

DATA_FILE = pathlib.Path(__file__).with_name("shirt_data.json")

#: The parts of the shirt that get drawn (shorts and socks aren't shown).
SHIRT_PARTS = ("la", "b", "ra")
#: A player has to have been named in at least this many matchday squads to be an answer.
MIN_APPEARANCES = 10
SEASON_OPTIONS = 4
#: The order a club's kits are shown in.
KIT_ORDER = ("home", "away", "third")


@functools.cache
def load() -> dict[str, list[dict[str, Any]]]:
    return json.loads(DATA_FILE.read_text())


#: How each part is named in Wikimedia Commons file names ("Kit left arm.png", "Kit body_leicester1516H.png").
PART_LABELS = {"la": "left arm", "b": "body", "ra": "right arm"}


def commons_url(title: str) -> str:
    """Where Wikimedia serves a Commons file: the folders come from the first characters of an MD5 of its name."""
    name = f"Kit {title}.png".replace(" ", "_")
    digest = hashlib.md5(name.encode()).hexdigest()
    return f"https://upload.wikimedia.org/wikipedia/commons/{digest[0]}/{digest[:2]}/{urllib.parse.quote(name)}"


def kit_images(kit_type: str, kit: dict[str, Any]) -> dict[str, Any]:
    """Image URLs for a kit's shirt, to be loaded by the browser: the plain outline for each part and,
    where the kit has one, its pattern. (A pattern file that doesn't exist just won't draw.)"""
    return {
        "type": kit_type,
        "colours": {part: kit[part]["colour"] for part in SHIRT_PARTS},
        "base": {part: commons_url(PART_LABELS[part]) for part in SHIRT_PARTS},
        "patterns": {
            part: commons_url(f"{PART_LABELS[part]}{kit[part]['pattern']}") if kit[part]["pattern"] else None
            for part in SHIRT_PARTS
        },
    }


def display_name(club: str) -> str:
    """"Arsenal FC" -> "Arsenal", "Sunderland AFC" -> "Sunderland" ("AFC Bournemouth" is left alone)."""
    for suffix in (" FC", " AFC"):
        if club.endswith(suffix):
            return club.removesuffix(suffix)
    return club


def team_names() -> list[str]:
    return sorted({display_name(entry["club"]) for clubs in load().values() for entry in clubs})


@dataclass(frozen=True)
class Choice:
    season: str
    club: str  # as in the data file; use display_name() to show it
    number: int
    player: str
    squad: list[str]
    season_options: list[str]
    #: The club's kits that season (home, away, third where they exist), as built by `kit_images`.
    kits: list[dict[str, Any]]


def _squad_answers(players: list[list[Any]]) -> list[list[Any]]:
    """Players who can be the answer: well-known enough, and the only one wearing their number."""
    counts: dict[int, int] = {}
    for number, _, _ in players:
        counts[number] = counts.get(number, 0) + 1
    return [p for p in players if counts[p[0]] == 1 and p[2] >= MIN_APPEARANCES]


def pick(day: datetime.date) -> Choice:
    """The same shirt for everyone on a given day, whenever it's built."""
    rng = random.Random(f"shirt-game-3:{day.isoformat()}")
    data = load()
    options = [(season, entry) for season in sorted(data) for entry in data[season] if _squad_answers(entry["players"])]
    season, entry = rng.choice(options)
    number, player, _ = rng.choice(_squad_answers(entry["players"]))

    # Wrong seasons come from the same club where possible, so the choice isn't just "which era".
    club_seasons = sorted({s for s in data if any(e["club"] == entry["club"] for e in data[s])} - {season})
    others = [s for s in sorted(data) if s != season and s not in club_seasons]
    rng.shuffle(club_seasons)
    rng.shuffle(others)
    wrong = (club_seasons + others)[: SEASON_OPTIONS - 1]
    season_options = sorted([season, *wrong])

    kits = [kit_images(kind, entry["kits"][kind]) for kind in KIT_ORDER if kind in entry["kits"]]
    return Choice(
        season=season,
        club=entry["club"],
        number=number,
        player=player,
        squad=sorted({name for _, name, _ in entry["players"]}),
        season_options=season_options,
        kits=kits,
    )
