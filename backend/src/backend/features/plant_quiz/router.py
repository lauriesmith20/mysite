"""Routes for the Plant Quiz feature (Normal Quiz + Big Quiz + leaderboards)."""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.auth import require_approved_account
from backend.database import get_db
from backend.features.accounts.models import AllowedAccount
from backend.features.plant_quiz.data import IMG_BASE, PLANTS
from backend.features.plant_quiz.models import PlantQuizBigScore, PlantQuizScore
from backend.features.plant_quiz.schemas import (
    BigLeaderboardEntry,
    LeaderboardEntry,
    PlantRead,
    ScoreBigIn,
    ScoreIn,
)

router = APIRouter(prefix="/api/plant-quiz", tags=["plant-quiz"])


def _player_name(account: AllowedAccount) -> str:
    return account.display_name or account.email


@router.get("/plants", response_model=list[PlantRead])
def list_plants() -> list[dict[str, str]]:
    return [{"name": p["name"], "img": IMG_BASE + p["img"]} for p in PLANTS]


@router.post("/score")
def save_score(
    payload: ScoreIn,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    db.add(
        PlantQuizScore(
            player_name=_player_name(account), correct=payload.correct, total=payload.total
        )
    )
    db.commit()
    return {"ok": True}


@router.post("/big-score")
def save_big_score(
    payload: ScoreBigIn,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    db.add(PlantQuizBigScore(player_name=_player_name(account), score=payload.score))
    db.commit()
    return {"ok": True}


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def leaderboard(db: Session = Depends(get_db)) -> list[dict[str, object]]:
    avg_expr = func.avg(PlantQuizScore.correct * 10.0 / PlantQuizScore.total)
    rows = (
        db.query(
            PlantQuizScore.player_name,
            func.round(avg_expr, 1).label("avg_score"),
            func.count().label("games_played"),
        )
        .filter(PlantQuizScore.total > 0)
        .group_by(func.lower(PlantQuizScore.player_name))
        .order_by(avg_expr.desc(), func.count().desc())
        .limit(10)
        .all()
    )
    return [
        {"player_name": r.player_name, "avg_score": r.avg_score, "games_played": r.games_played}
        for r in rows
    ]


@router.get("/big-leaderboard", response_model=list[BigLeaderboardEntry])
def big_leaderboard(db: Session = Depends(get_db)) -> list[dict[str, object]]:
    rows = (
        db.query(
            PlantQuizBigScore.player_name,
            func.max(PlantQuizBigScore.score).label("best_score"),
            func.count().label("attempts"),
        )
        .group_by(func.lower(PlantQuizBigScore.player_name))
        .order_by(func.max(PlantQuizBigScore.score).desc(), func.count().asc())
        .limit(10)
        .all()
    )
    return [
        {"player_name": r.player_name, "best_score": r.best_score, "attempts": r.attempts}
        for r in rows
    ]
