"""Routes for results of once-a-day puzzle games, tied to the signed-in account.

The first result recorded for a game on a given day is final: posting again returns the stored one
instead of replacing it, so a game can't be replayed for a better score and retries are harmless.
"""
import datetime
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.auth import require_approved_account
from backend.config import get_settings
from backend.database import get_db
from backend.features.accounts.models import AllowedAccount
from backend.features.accounts.schemas import AccountSummary
from backend.features.daily_games.models import DailyGameResult
from backend.features.daily_games.registry import GAMES, DailyGame
from backend.features.daily_games.schemas import ResultIn, ResultRead
from backend.features.game_scores import daily_rivalry
from backend.features.game_scores.models import Game
from backend.features.game_scores.schemas import RivalToday

router = APIRouter(prefix="/api/daily-games", tags=["daily-games"])

MAX_DETAILS_BYTES = 4096


def _game(game_key: str) -> DailyGame:
    game = GAMES.get(game_key)
    if game is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown game: {game_key}")
    return game


def _existing(db: Session, account: AllowedAccount, game_key: str, day: datetime.date) -> DailyGameResult | None:
    return (
        db.query(DailyGameResult)
        .filter(
            DailyGameResult.account_id == account.id,
            DailyGameResult.game_key == game_key,
            DailyGameResult.puzzle_date == day,
        )
        .first()
    )


@router.post("/{game_key}/results", response_model=ResultRead, status_code=status.HTTP_201_CREATED)
def record_result(
    game_key: str,
    payload: ResultIn,
    response: Response,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> DailyGameResult:
    game = _game(game_key)
    if payload.score > game.max_score:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Score can be at most {game.max_score}")
    # Players use their local date, which can be a day ahead of UTC; anything further out is invalid.
    if payload.puzzle_date > datetime.datetime.now(datetime.UTC).date() + datetime.timedelta(days=1):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Puzzle date is in the future")
    if len(json.dumps(payload.details)) > MAX_DETAILS_BYTES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Details are too large")
    if game.validate is not None and (problem := game.validate(payload)) is not None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, problem)

    stored = _existing(db, account, game_key, payload.puzzle_date)
    if stored is not None:
        response.status_code = status.HTTP_200_OK
        return stored

    result = DailyGameResult(
        account_id=account.id,
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
        stored = _existing(db, account, game_key, payload.puzzle_date)
        if stored is None:
            raise
        response.status_code = status.HTTP_200_OK
        return stored
    db.refresh(result)
    return result


@router.get("/{game_key}/results", response_model=list[ResultRead])
def list_results(
    game_key: str,
    limit: int = Query(default=366, ge=1, le=1000),
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> list[DailyGameResult]:
    """The caller's own results for a game, newest day first."""
    _game(game_key)
    return list(
        db.query(DailyGameResult)
        .filter(DailyGameResult.account_id == account.id, DailyGameResult.game_key == game_key)
        .order_by(DailyGameResult.puzzle_date.desc())
        .limit(limit)
        .all()
    )


@router.get("/{game_key}/results/{puzzle_date}", response_model=ResultRead)
def get_result(
    game_key: str,
    puzzle_date: datetime.date,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> DailyGameResult:
    _game(game_key)
    stored = _existing(db, account, game_key, puzzle_date)
    if stored is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No result for that day")
    return stored


@router.delete("/{game_key}/results/{puzzle_date}", status_code=status.HTTP_204_NO_CONTENT)
def delete_result(
    game_key: str,
    puzzle_date: datetime.date,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> None:
    """Dev only: forgets the caller's result for a day so it can be played again. Results are final everywhere
    else, so this answers 404 unless the backend is running locally."""
    if get_settings().environment != "local":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    _game(game_key)
    stored = _existing(db, account, game_key, puzzle_date)
    if stored is not None:
        db.delete(stored)
        db.commit()


@router.get("/{game_key}/rivals/{puzzle_date}", response_model=list[RivalToday])
def rivals_for_day(
    game_key: str,
    puzzle_date: datetime.date,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> list[RivalToday]:
    """How the caller's accepted rivals did on a puzzle day. A rival's result is only included once the
    caller has finished that day themselves, so it can't spoil a game they haven't played yet."""
    _game(game_key)
    games = (
        db.query(Game)
        .filter(
            Game.daily_game_key == game_key,
            Game.challenge_status == daily_rivalry.ACCEPTED,
            or_(Game.creator_id == account.id, Game.opponent_id == account.id),
        )
        .order_by(Game.id)
        .all()
    )
    finished = _existing(db, account, game_key, puzzle_date) is not None

    out: list[RivalToday] = []
    for game in games:
        friend_id = game.opponent_id if game.creator_id == account.id else game.creator_id
        friend = db.get(AllowedAccount, friend_id)
        assert friend is not None
        theirs = daily_rivalry.counted_results(db, game, friend_id).get(puzzle_date)
        out.append(
            RivalToday(
                game_id=game.id,
                friend=AccountSummary.model_validate(friend),
                friend_played=theirs is not None,
                friend_result=daily_rivalry.day_result(theirs) if finished else None,
            )
        )
    return out
