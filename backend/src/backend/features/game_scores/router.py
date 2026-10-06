"""Routes for head-to-head game score tracking between friends."""
import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.auth import require_approved_account
from backend.database import get_db
from backend.features.accounts.models import AllowedAccount
from backend.features.accounts.schemas import AccountSummary
from backend.features.daily_games.registry import GAMES
from backend.features.friends.models import Friendship, FriendshipStatus
from backend.features.game_scores import daily_rivalry
from backend.features.game_scores.models import Game, GameScoreHistory
from backend.features.game_scores.schemas import (
    ChallengeAccept,
    ChallengeCreate,
    ChallengeRead,
    DayRead,
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
    creator_score, opponent_score, last_updated = game.creator_score, game.opponent_score, game.last_updated
    if daily_rivalry.is_active_rivalry(game):
        # Scores count days won, worked out from both players' daily results.
        tally = daily_rivalry.tally(daily_rivalry.rival_days(db, game))
        creator_score, opponent_score, last_updated = tally.creator_score, tally.opponent_score, tally.last_played
    elif game.daily_game_key is not None:
        creator_score, opponent_score, last_updated = 0, 0, None  # a challenge nobody has accepted yet
    return GameRead(
        id=game.id,
        creator=AccountSummary.model_validate(creator),
        opponent=AccountSummary.model_validate(opponent),
        name=game.name,
        image_url=game.image_url,
        creator_score=creator_score,
        opponent_score=opponent_score,
        is_daily=game.is_daily,
        last_updated=last_updated,
        daily_game_key=game.daily_game_key,
        challenge_status=game.challenge_status,
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


def _between(account_id: int, other_id: int):
    return or_(
        (Game.creator_id == account_id) & (Game.opponent_id == other_id),
        (Game.creator_id == other_id) & (Game.opponent_id == account_id),
    )


@router.post("/challenges", response_model=GameRead, status_code=status.HTTP_201_CREATED)
def create_challenge(
    payload: ChallengeCreate,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> GameRead:
    """Challenge a friend to a rivalry over one of the built-in daily games. They must accept it, and it
    then counts from the day they accept (including that day)."""
    if payload.opponent_id == account.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot challenge yourself")
    _require_friend(db, account, payload.opponent_id)
    daily_game = GAMES.get(payload.daily_game_key)
    if daily_game is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown game: {payload.daily_game_key}")

    existing = (
        db.query(Game)
        .filter(
            Game.daily_game_key == daily_game.key,
            Game.challenge_status.in_([daily_rivalry.PENDING, daily_rivalry.ACCEPTED]),
            _between(account.id, payload.opponent_id),
        )
        .first()
    )
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "There is already a challenge or rivalry for this game")

    game = Game(
        creator_id=account.id,
        opponent_id=payload.opponent_id,
        name=daily_game.title,
        is_daily=True,
        daily_game_key=daily_game.key,
        challenge_status=daily_rivalry.PENDING,
    )
    db.add(game)
    db.commit()
    db.refresh(game)
    return _game_read(game, db)


@router.get("/challenges/incoming", response_model=list[ChallengeRead])
def list_incoming_challenges(
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> list[ChallengeRead]:
    games = (
        db.query(Game)
        .filter(
            Game.opponent_id == account.id,
            Game.challenge_status == daily_rivalry.PENDING,
            Game.daily_game_key.is_not(None),
        )
        .order_by(Game.id)
        .all()
    )
    out: list[ChallengeRead] = []
    for game in games:
        challenger = db.get(AllowedAccount, game.creator_id)
        assert challenger is not None and game.daily_game_key is not None
        daily_game = GAMES.get(game.daily_game_key)
        out.append(
            ChallengeRead(
                id=game.id,
                daily_game_key=game.daily_game_key,
                title=daily_game.title if daily_game else game.name,
                challenger=AccountSummary.model_validate(challenger),
            )
        )
    return out


def _pending_challenge_for(db: Session, game_id: int, account: AllowedAccount) -> Game:
    game = _get_game_for_participant(db, game_id, account.id)
    if game.daily_game_key is None or game.challenge_status != daily_rivalry.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "There is no pending challenge here")
    if game.opponent_id != account.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the person challenged can respond")
    return game


@router.post("/{game_id}/accept", response_model=GameRead)
def accept_challenge(
    game_id: int,
    payload: ChallengeAccept | None = None,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> GameRead:
    game = _pending_challenge_for(db, game_id, account)
    now = datetime.datetime.now(datetime.UTC)
    local_date = payload.local_date if payload else None
    # Players' local dates can be a day either side of UTC; anything further out is wrong.
    if local_date is not None and abs((local_date - now.date()).days) > 1:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "local_date is too far from today")
    game.challenge_status = daily_rivalry.ACCEPTED
    game.accepted_at = now
    game.started_on = local_date or now.date()
    db.commit()
    db.refresh(game)
    return _game_read(game, db)


@router.post("/{game_id}/decline", status_code=status.HTTP_204_NO_CONTENT)
def decline_challenge(
    game_id: int,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> None:
    game = _pending_challenge_for(db, game_id, account)
    db.delete(game)
    db.commit()


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
    if game.daily_game_key is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This game's score comes from the daily results")
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


@router.get("/{game_id}/days", response_model=list[DayRead])
def list_days(
    game_id: int,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> list[DayRead]:
    """Day-by-day results of a daily-game rivalry, newest first. The other player's result for a day is
    only revealed once the caller has finished that day themselves."""
    game = _get_game_for_participant(db, game_id, account.id)
    if game.daily_game_key is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This isn't a daily-game rivalry")
    i_am_creator = game.creator_id == account.id

    out: list[DayRead] = []
    for day in daily_rivalry.rival_days(db, game):
        mine = day.creator if i_am_creator else day.opponent
        theirs = day.opponent if i_am_creator else day.creator
        winner: str | None = None
        if mine is not None and day.winner is not None:
            winner = "draw" if day.winner == "draw" else "me" if (day.winner == "creator") == i_am_creator else "them"
        out.append(
            DayRead(
                puzzle_date=day.puzzle_date,
                mine=daily_rivalry.day_result(mine),
                theirs=daily_rivalry.day_result(theirs) if mine is not None else None,
                their_played=theirs is not None,
                winner=winner,  # type: ignore[arg-type]
                decided_by=day.decided_by if winner in ("me", "them") else None,
            )
        )
    return out


@router.delete("/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_game(
    game_id: int,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> None:
    game = _get_game_for_participant(db, game_id, account.id)
    # Score history rows reference the game, and Turso enforces foreign keys, so remove them first.
    db.query(GameScoreHistory).filter(GameScoreHistory.game_id == game.id).delete()
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

