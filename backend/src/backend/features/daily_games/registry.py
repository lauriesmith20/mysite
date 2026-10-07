"""The once-a-day games that can record results. Adding a game is one entry here (plus its frontend
registry entry in frontend/src/lib/dailyGameRegistry.ts); the table, routes, history page and
rivalry challenges are shared."""
import datetime
from collections.abc import Callable
from dataclasses import dataclass

from backend.features.daily_games.models import DailyGameResult
from backend.features.daily_games.schemas import ResultIn

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


# ── Wordle (played on nytimes.com; players paste their share text, see frontend lib/wordle.ts) ─────────

#: Wordle #0 was 19 June 2021, and the number goes up by one each day.
WORDLE_EPOCH = datetime.date(2021, 6, 19)
WORDLE_MAX_GUESSES = 6


def wordle_date(number: int) -> datetime.date:
    return WORDLE_EPOCH + datetime.timedelta(days=number)


def _wordle_rank(result: DailyGameResult) -> RankKey:
    """Fewer guesses wins; the same number of guesses (or two fails) is a draw. Hard mode doesn't matter."""
    return (result.score,)


def _validate_wordle(payload: ResultIn) -> str | None:
    """A pasted result has to hang together: the puzzle number must be for that day, and the score,
    guess count and grid must agree. (It can't be proven genuine, only consistent.)"""
    details = payload.details
    number = details.get("puzzle_number")
    if not isinstance(number, int) or isinstance(number, bool) or number < 0:
        return "Missing Wordle puzzle number"
    if wordle_date(number) != payload.puzzle_date:
        return "That Wordle number isn't for that day"
    attempts = details.get("attempts")
    if payload.outcome == "won":
        if not isinstance(attempts, int) or isinstance(attempts, bool) or not 1 <= attempts <= WORDLE_MAX_GUESSES:
            return "A solved Wordle needs 1 to 6 guesses"
        if payload.score != WORDLE_MAX_GUESSES + 1 - attempts:
            return "Score doesn't match the number of guesses"
    elif payload.score != 0:
        return "A failed Wordle scores 0"
    grid = details.get("grid")
    if grid is not None:
        expected_rows = attempts if payload.outcome == "won" else WORDLE_MAX_GUESSES
        if not isinstance(grid, list) or not all(isinstance(row, str) for row in grid) or len(grid) != expected_rows:
            return "The grid doesn't match the number of guesses"
    return None


# ── Name the Shirt (a shirt with a number: guess the team, the season, then the player) ────────────────

SHIRT_STAGES = 3
SHIRT_LIVES = 3


def _shirt_rank(result: DailyGameResult) -> RankKey:
    """Stages right, then lives left."""
    return (result.score, _number((result.details or {}).get("lives_left")))


def _validate_shirt(payload: ResultIn) -> str | None:
    details = payload.details
    lives = details.get("lives_left")
    if not isinstance(lives, int) or isinstance(lives, bool) or not 0 <= lives <= SHIRT_LIVES:
        return f"Lives left must be 0 to {SHIRT_LIVES}"
    if (payload.outcome == "won") != (payload.score == SHIRT_STAGES):
        return "A shirt is won by getting all three stages right"
    if payload.outcome == "won" and lives == 0:
        return "You can't finish with no lives left"
    return None


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
    #: Extra checks on a submitted result; returns an error message, or None if it's fine.
    validate: Callable[[ResultIn], str | None] | None = None


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
        DailyGame(
            key="wordle",
            title="Wordle",
            max_score=WORDLE_MAX_GUESSES,  # 7 minus the guesses used, so 1/6 scores 6 and a fail scores 0
            rank=_wordle_rank,
            rank_labels=("guesses",),
            validate=_validate_wordle,
        ),
        DailyGame(
            key="shirt-game",
            title="Name the Shirt",
            max_score=SHIRT_STAGES,  # team, season, player
            rank=_shirt_rank,
            rank_labels=("stages", "lives"),
            validate=_validate_shirt,
        ),
    ]
}


def compare_results(game: DailyGame, first: DailyGameResult, second: DailyGameResult) -> tuple[int, str | None]:
    """1 if `first` beat `second`, -1 if it lost, 0 for a draw; plus what decided it (None for a draw)."""
    for label, a, b in zip(game.rank_labels, game.rank(first), game.rank(second), strict=True):
        if a != b:
            return (1 if a > b else -1), label
    return 0, None
