"""Routes for results of once-a-day puzzle games, tied to the signed-in account.

The first result recorded for a game on a given day is final: posting again returns the stored one
instead of replacing it, so a game can't be replayed for a better score and retries are harmless.
"""
import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.auth import require_approved_account
from backend.config import get_settings
from backend.database import get_db
from backend.features.accounts.models import AllowedAccount
from backend.features.accounts.schemas import AccountSummary
from backend.features.daily_games.models import DailyGameResult
from backend.features.daily_games.registry import DailyGame
from backend.features.daily_games.schemas import ResultIn, ResultRead
from backend.features.daily_games.service import (
    existing_result,
    get_game,
    record_result,
)
from backend.features.game_scores import daily_rivalry
from backend.features.game_scores.models import Game
from backend.features.game_scores.schemas import RivalToday

router = APIRouter(prefix="/api/daily-games", tags=["daily-games"])



def _game(game_key: str) -> DailyGame:
    return get_game(game_key)


def _existing(db: Session, account: AllowedAccount, game_key: str, day: datetime.date) -> DailyGameResult | None:
    return existing_result(db, account.id, game_key, day)


@router.post("/{game_key}/results", response_model=ResultRead, status_code=status.HTTP_201_CREATED)
def record_result_route(
    game_key: str,
    payload: ResultIn,
    response: Response,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> DailyGameResult:
    result, created = record_result(db, account.id, game_key, payload)
    if not created:
        response.status_code = status.HTTP_200_OK
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
