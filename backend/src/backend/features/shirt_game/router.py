"""Routes for the shirt game: a day's shirt, checking guesses, and the answers once you've finished.

Answers stay on the server: the shirt endpoint doesn't include them, each guess is checked here, and
the full answers only come back once the caller has a recorded result for that day. Results themselves
go through the shared daily-games routes under the "shirt-game" key.
"""
import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.auth import require_approved_account
from backend.database import get_db
from backend.features.accounts.models import AllowedAccount
from backend.features.daily_games.models import DailyGameResult
from backend.features.shirt_game import data
from backend.features.shirt_game.models import ShirtPuzzle
from backend.features.shirt_game.schemas import (
    AnswerRead,
    GuessIn,
    GuessRead,
    PuzzleRead,
)

router = APIRouter(prefix="/api/shirt-game", tags=["shirt-game"])

GAME_KEY = "shirt-game"


def _normal(text: str) -> str:
    return " ".join(text.split()).casefold()


def _puzzle(db: Session, day: datetime.date) -> ShirtPuzzle:
    """The day's shirt, picked the first time it's asked for so everyone gets the same one."""
    existing = db.query(ShirtPuzzle).filter(ShirtPuzzle.puzzle_date == day).first()
    if existing is not None:
        return existing
    choice = data.pick(day)
    puzzle = ShirtPuzzle(
        puzzle_date=day,
        season=choice.season,
        club=data.display_name(choice.club),
        number=choice.number,
        player=choice.player,
        squad=choice.squad,
        season_options=choice.season_options,
        kits=choice.kits,
    )
    db.add(puzzle)
    try:
        db.commit()
    except IntegrityError:
        # Two requests built it at once; use the one that got there first.
        db.rollback()
        existing = db.query(ShirtPuzzle).filter(ShirtPuzzle.puzzle_date == day).first()
        if existing is None:
            raise
        return existing
    db.refresh(puzzle)
    return puzzle


def _check_day(day: datetime.date) -> None:
    # Players use their local date, which can be a day ahead of UTC; anything further out is invalid.
    if day > datetime.datetime.now(datetime.UTC).date() + datetime.timedelta(days=1):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Puzzle date is in the future")


@router.get("/puzzles/{puzzle_date}", response_model=PuzzleRead)
def get_puzzle(puzzle_date: datetime.date, db: Session = Depends(get_db)) -> PuzzleRead:
    _check_day(puzzle_date)
    puzzle = _puzzle(db, puzzle_date)
    return PuzzleRead(
        puzzle_date=puzzle.puzzle_date,
        number=puzzle.number,
        kits=puzzle.kits,
        teams=data.team_names(),
        season_options=puzzle.season_options,
    )


@router.post("/puzzles/{puzzle_date}/guess", response_model=GuessRead)
def guess(puzzle_date: datetime.date, payload: GuessIn, db: Session = Depends(get_db)) -> GuessRead:
    _check_day(puzzle_date)
    puzzle = _puzzle(db, puzzle_date)
    answer = {"team": puzzle.club, "season": puzzle.season, "player": puzzle.player}[payload.stage]
    if _normal(payload.value) != _normal(answer):
        return GuessRead(correct=False)
    return GuessRead(
        correct=True,
        answer=answer,
        squad=puzzle.squad if payload.stage == "season" else None,
    )


@router.get("/puzzles/{puzzle_date}/answer", response_model=AnswerRead)
def get_answer(
    puzzle_date: datetime.date,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> AnswerRead:
    """Only for someone who has finished that day, so it can't be used to look the answer up early."""
    finished = (
        db.query(DailyGameResult)
        .filter(
            DailyGameResult.account_id == account.id,
            DailyGameResult.game_key == GAME_KEY,
            DailyGameResult.puzzle_date == puzzle_date,
        )
        .first()
    )
    if finished is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Finish the day's shirt to see the answer")
    puzzle = db.query(ShirtPuzzle).filter(ShirtPuzzle.puzzle_date == puzzle_date).first()
    if puzzle is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No shirt for that day")
    return AnswerRead(
        team=puzzle.club,
        season=puzzle.season,
        player=puzzle.player,
        squad=puzzle.squad,
    )
