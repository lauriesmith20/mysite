"""Rivalries over built-in daily games (see features/daily_games): who won each puzzle day.

A rivalry game's scores aren't tapped in by hand. They are worked out from both players' daily
results: every puzzle day from the day the rivalry started (including that day, even if a result was
recorded before the challenge was accepted) on which both played, one point per day won.
"""
import datetime
from dataclasses import dataclass

from sqlalchemy.orm import Session

from backend.features.daily_games.models import DailyGameResult
from backend.features.daily_games.registry import GAMES, compare_results
from backend.features.game_scores.models import Game
from backend.features.game_scores.schemas import DayResult

PENDING = "pending"
ACCEPTED = "accepted"


@dataclass
class Day:
    puzzle_date: datetime.date
    creator: DailyGameResult | None
    opponent: DailyGameResult | None
    #: "creator" / "opponent" / "draw", or None while one side hasn't played.
    winner: str | None
    decided_by: str | None


def is_active_rivalry(game: Game) -> bool:
    return game.daily_game_key is not None and game.challenge_status == ACCEPTED


def start_date(game: Game) -> datetime.date | None:
    """The first puzzle day that counts: the accepter's local date, else the day it was accepted (UTC)."""
    if game.started_on is not None:
        return game.started_on
    return game.accepted_at.date() if game.accepted_at is not None else None


def counted_results(db: Session, game: Game, account_id: int) -> dict[datetime.date, DailyGameResult]:
    """An account's results that count towards this rivalry, by puzzle day.

    Every result for a puzzle day on or after the day the rivalry started, whenever during that day
    it was recorded, so playing before accepting doesn't lose the day. Earlier days never count.
    """
    first_day = start_date(game)
    if not is_active_rivalry(game) or first_day is None:
        return {}
    rows = (
        db.query(DailyGameResult)
        .filter(
            DailyGameResult.account_id == account_id,
            DailyGameResult.game_key == game.daily_game_key,
            DailyGameResult.puzzle_date >= first_day,
        )
        .all()
    )
    return {row.puzzle_date: row for row in rows}


def rival_days(db: Session, game: Game) -> list[Day]:
    """Every puzzle day either player has played since the rivalry started, newest first."""
    if not is_active_rivalry(game):
        return []
    daily_game = GAMES[game.daily_game_key]  # type: ignore[index]
    creator = counted_results(db, game, game.creator_id)
    opponent = counted_results(db, game, game.opponent_id)

    days: list[Day] = []
    for day in sorted(set(creator) | set(opponent), reverse=True):
        mine, theirs = creator.get(day), opponent.get(day)
        winner: str | None = None
        decided_by: str | None = None
        if mine is not None and theirs is not None:
            outcome, decided_by = compare_results(daily_game, mine, theirs)
            winner = "creator" if outcome > 0 else "opponent" if outcome < 0 else "draw"
        days.append(Day(puzzle_date=day, creator=mine, opponent=theirs, winner=winner, decided_by=decided_by))
    return days


@dataclass
class Tally:
    creator_score: int
    opponent_score: int
    last_played: datetime.datetime | None


def tally(days: list[Day]) -> Tally:
    """Days won by each side, and when a result last came in."""
    created = [r.created_at for day in days for r in (day.creator, day.opponent) if r is not None]
    return Tally(
        creator_score=sum(1 for d in days if d.winner == "creator"),
        opponent_score=sum(1 for d in days if d.winner == "opponent"),
        last_played=max(created) if created else None,
    )


def day_result(result: DailyGameResult | None) -> DayResult | None:
    if result is None:
        return None
    return DayResult(score=result.score, outcome=result.outcome, details=result.details or {})  # type: ignore[arg-type]
