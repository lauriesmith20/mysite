"""Routes for head-to-head game score tracking between friends."""
import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.auth import require_approved_account
from backend.database import get_db
from backend.features.accounts.models import AllowedAccount
from backend.features.accounts.schemas import AccountSummary
from backend.features.friends.models import Friendship, FriendshipStatus
from backend.features.game_scores.models import Game, GameScoreHistory
from backend.features.game_scores.schemas import (
    GameCreate,
    GameRead,
    GameUpdate,
    ScoreHistoryRead,
    ScoreIncrement,
)
from backend.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/game-scores", tags=["game-scores"])


def _game_read(game: Game, db: Session) -> GameRead:
    creator = db.get(AllowedAccount, game.creator_id)
    opponent = db.get(AllowedAccount, game.opponent_id)
    assert creator is not None and opponent is not None
    return GameRead(
        id=game.id,
        creator=AccountSummary.model_validate(creator),
        opponent=AccountSummary.model_validate(opponent),
        name=game.name,
        image_url=game.image_url,
        creator_score=game.creator_score,
        opponent_score=game.opponent_score,
        is_daily=game.is_daily,
        last_updated=game.last_updated,
    )


def _require_friend(db: Session, account: AllowedAccount, friend_id: int) -> None:
    friendship = (
        db.query(Friendship)
        .filter(
            Friendship.status == FriendshipStatus.ACCEPTED,
            or_(
                (Friendship.requester_id == account.id) & (Friendship.addressee_id == friend_id),
                (Friendship.requester_id == friend_id) & (Friendship.addressee_id == account.id),
            ),
        )
        .first()
    )
    if friendship is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not friends with this account")


def _get_game_for_participant(db: Session, game_id: int, account_id: int) -> Game:
    game = db.get(Game, game_id)
    if game is None or account_id not in (game.creator_id, game.opponent_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Game not found")
    return game


@router.get("/with/{friend_id}", response_model=list[GameRead])
def list_games_with_friend(
    friend_id: int,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> list[GameRead]:
    _require_friend(db, account, friend_id)
    games = (
        db.query(Game)
        .filter(
            or_(
                (Game.creator_id == account.id) & (Game.opponent_id == friend_id),
                (Game.creator_id == friend_id) & (Game.opponent_id == account.id),
            )
        )
        .order_by(Game.id)
        .all()
    )
    return [_game_read(game, db) for game in games]


@router.post("/", response_model=GameRead, status_code=status.HTTP_201_CREATED)
def create_game(
    payload: GameCreate,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> GameRead:
    if payload.opponent_id == account.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot play against yourself")
    _require_friend(db, account, payload.opponent_id)

    game = Game(
        creator_id=account.id,
        opponent_id=payload.opponent_id,
        name=payload.name,
        image_url=payload.image_url,
        is_daily=payload.is_daily,
    )
    db.add(game)
    db.commit()
    db.refresh(game)
    return _game_read(game, db)


@router.get("/{game_id}", response_model=GameRead)
def get_game(
    game_id: int,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> GameRead:
    game = _get_game_for_participant(db, game_id, account.id)
    return _game_read(game, db)


@router.post("/{game_id}/score", response_model=GameRead)
def update_score(
    game_id: int,
    payload: ScoreIncrement,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> GameRead:
    game = _get_game_for_participant(db, game_id, account.id)
    if payload.player_id not in (game.creator_id, game.opponent_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Player must be a participant")

    now = datetime.datetime.now(datetime.UTC)
    if game.is_daily and game.last_updated is not None and game.last_updated.date() == now.date():
        raise HTTPException(status.HTTP_409_CONFLICT, "Score already updated today")

    if payload.player_id == game.creator_id:
        game.creator_score += payload.delta
        resulting_score = game.creator_score
    else:
        game.opponent_score += payload.delta
        resulting_score = game.opponent_score
    game.last_updated = now
    db.add(
        GameScoreHistory(
            game_id=game.id,
            player_id=payload.player_id,
            delta=payload.delta,
            resulting_score=resulting_score,
            changed_by=account.display_name or account.email,
            created_at=now,
        )
    )
    db.commit()
    db.refresh(game)
    logger.info(
        "Score added: %s %+d for account %d (by %s -> %d)",
        game.name, payload.delta, payload.player_id, account.email, resulting_score,
    )
    return _game_read(game, db)


@router.get("/{game_id}/history", response_model=list[ScoreHistoryRead])
def get_score_history(
    game_id: int,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> list[GameScoreHistory]:
    _get_game_for_participant(db, game_id, account.id)
    return list(
        db.query(GameScoreHistory)
        .filter(GameScoreHistory.game_id == game_id)
        .order_by(GameScoreHistory.created_at.desc())
        .all()
    )


@router.delete("/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_game(
    game_id: int,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> None:
    game = _get_game_for_participant(db, game_id, account.id)
    db.delete(game)
    db.commit()


@router.patch("/{game_id}", response_model=GameRead)
def update_game(
    game_id: int,
    payload: GameUpdate,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> GameRead:
    game = _get_game_for_participant(db, game_id, account.id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(game, field, value)

    db.commit()
    db.refresh(game)
    return _game_read(game, db)

