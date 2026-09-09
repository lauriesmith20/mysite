"""Routes for head-to-head game score tracking."""
import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.features.game_scores.models import Game
from backend.features.game_scores.schemas import (
    GameCreate,
    GameRead,
    GameUpdate,
    ScoreIncrement,
)

router = APIRouter(prefix="/api/game-scores", tags=["game-scores"])


@router.get("/", response_model=list[GameRead])
def list_games(db: Session = Depends(get_db)) -> list[Game]:
    return list(db.query(Game).order_by(Game.id).all())


@router.post("/", response_model=GameRead, status_code=status.HTTP_201_CREATED)
def create_game(payload: GameCreate, db: Session = Depends(get_db)) -> Game:
    game = Game(name=payload.name, image_url=payload.image_url, is_daily=payload.is_daily)
    db.add(game)
    db.commit()
    db.refresh(game)
    return game


@router.get("/{game_id}", response_model=GameRead)
def get_game(game_id: int, db: Session = Depends(get_db)) -> Game:
    game = db.get(Game, game_id)
    if game is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Game not found")
    return game


@router.post("/{game_id}/score", response_model=GameRead)
def update_score(game_id: int, payload: ScoreIncrement, db: Session = Depends(get_db)) -> Game:
    game = db.get(Game, game_id)
    if game is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Game not found")

    now = datetime.datetime.now(datetime.UTC)
    if game.is_daily and game.last_updated is not None and game.last_updated.date() == now.date():
        raise HTTPException(status.HTTP_409_CONFLICT, "Score already updated today")

    if payload.player == "laurie":
        game.laurie_score += payload.delta
    else:
        game.maeve_score += payload.delta
    game.last_updated = now
    db.commit()
    db.refresh(game)
    return game


@router.delete("/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_game(game_id: int, db: Session = Depends(get_db)) -> None:
    game = db.get(Game, game_id)
    if game is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Game not found")
    db.delete(game)
    db.commit()


@router.patch("/{game_id}", response_model=GameRead)
def update_game(game_id: int, payload: GameUpdate, db: Session = Depends(get_db)) -> Game:
    game = db.get(Game, game_id)
    if game is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Game not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(game, field, value)

    db.commit()
    db.refresh(game)
    return game
