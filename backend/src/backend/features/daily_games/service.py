"""Recording a daily-game result for an account, with the checks every route that records one shares.

The first result recorded for an account, game and day is final: recording again returns the stored one.
"""
import datetime
import json

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.features.daily_games.models import DailyGameResult
from backend.features.daily_games.registry import GAMES, DailyGame
from backend.features.daily_games.schemas import ResultIn

MAX_DETAILS_BYTES = 4096


def get_game(game_key: str) -> DailyGame:
    game = GAMES.get(game_key)
    if game is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown game: {game_key}")
    return game


def existing_result(db: Session, account_id: int, game_key: str, day: datetime.date) -> DailyGameResult | None:
    return (
        db.query(DailyGameResult)
        .filter(
            DailyGameResult.account_id == account_id,
            DailyGameResult.game_key == game_key,
            DailyGameResult.puzzle_date == day,
        )
        .first()
    )


def record_result(
    db: Session, account_id: int, game_key: str, payload: ResultIn
) -> tuple[DailyGameResult, bool]:
    """Checks a result and stores it for the account. Returns it and whether it was newly stored (False when that day
    already had one, which stands)."""
    game = get_game(game_key)
    if payload.score > game.max_score:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Score can be at most {game.max_score}")
    # Players use their local date, which can be a day ahead of UTC; anything further out is invalid.
    if payload.puzzle_date > datetime.datetime.now(datetime.UTC).date() + datetime.timedelta(days=1):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Puzzle date is in the future")
    if len(json.dumps(payload.details)) > MAX_DETAILS_BYTES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Details are too large")
    if game.validate is not None and (problem := game.validate(payload)) is not None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, problem)

    stored = existing_result(db, account_id, game_key, payload.puzzle_date)
    if stored is not None:
        return stored, False

    result = DailyGameResult(
        account_id=account_id,
        game_key=game_key,
        puzzle_date=payload.puzzle_date,
        score=payload.score,
        outcome=payload.outcome,
        details=payload.details,
    )
    db.add(result)
    try:
        db.commit()
    except IntegrityError:
        # Two submissions raced; the other one won.
        db.rollback()
        stored = existing_result(db, account_id, game_key, payload.puzzle_date)
        if stored is None:
            raise
        return stored, False
    db.refresh(result)
    return result, True
