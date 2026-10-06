"""The once-a-day games that can record results. Adding a game is one entry here (plus its frontend
registry entry in frontend/src/lib/dailyGameRegistry.ts); the table, routes, history page and
rivalry challenges are shared."""
from collections.abc import Callable
from dataclasses import dataclass

from backend.features.daily_games.models import DailyGameResult

#: Higher is better. Compared element by element, so a tie on the first value falls through to the next.
RankKey = tuple[int, ...]


def _number(value: object) -> int:
    return value if isinstance(value, int) else 0


def _country_hopper_rank(result: DailyGameResult) -> RankKey:
    """Suitcases, then lives left, then fewer hops. Every loss ties: stopping early isn't "fewer hops"."""
    if result.outcome != "won":
        return (0, 0, 0)
    details = result.details or {}
    return (result.score, _number(details.get("lives_left")), -_number(details.get("borders")))


@dataclass(frozen=True)
class DailyGame:
    key: str
    title: str
    #: Highest score a result may carry; scores run from 0 to this.
    max_score: int
    #: How two results are ranked when rivals play the same day.
    rank: Callable[[DailyGameResult], RankKey]
    #: Names for each element of `rank`, used to say what decided a day ("won on lives").
    rank_labels: tuple[str, ...]


GAMES: dict[str, DailyGame] = {
    game.key: game
    for game in [
        DailyGame(
            key="country-hopper",
            title="Country Hopper",
            max_score=5,  # suitcases
            rank=_country_hopper_rank,
            rank_labels=("suitcases", "lives", "hops"),
        ),
    ]
}


def compare_results(game: DailyGame, first: DailyGameResult, second: DailyGameResult) -> tuple[int, str | None]:
    """1 if `first` beat `second`, -1 if it lost, 0 for a draw; plus what decided it (None for a draw)."""
    for label, a, b in zip(game.rank_labels, game.rank(first), game.rank(second), strict=True):
        if a != b:
            return (1 if a > b else -1), label
    return 0, None
