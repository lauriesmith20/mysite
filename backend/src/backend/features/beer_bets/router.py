"""Routes for beer bets between friends."""
import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.auth import require_approved_account
from backend.database import get_db
from backend.features.accounts.models import AllowedAccount
from backend.features.accounts.schemas import AccountSummary
from backend.features.beer_bets.models import BeerBet, BeerBetStatus
from backend.features.beer_bets.schemas import (
    BeerBetCreate,
    BeerBetRead,
    BeerBetResolve,
    BeerBetSummary,
    CashOutCreate,
)
from backend.features.friends.models import Friendship, FriendshipStatus

router = APIRouter(prefix="/api/beer-bets", tags=["beer-bets"])


def _bet_read(bet: BeerBet, db: Session) -> BeerBetRead:
    creator = db.get(AllowedAccount, bet.creator_id)
    opponent = db.get(AllowedAccount, bet.opponent_id)
    assert creator is not None and opponent is not None
    return BeerBetRead(
        id=bet.id,
        creator=AccountSummary.model_validate(creator),
        opponent=AccountSummary.model_validate(opponent),
        title=bet.title,
        description=bet.description,
        stake=bet.stake,
        status=bet.status,
        winner_id=bet.winner_id,
        claimed_winner_id=bet.claimed_winner_id,
        claimed_by_id=bet.claimed_by_id,
        is_settlement=bet.is_settlement,
        created_at=bet.created_at,
        resolved_at=bet.resolved_at,
        cancelled_at=bet.cancelled_at,
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


def _get_bet_for_participant(db: Session, bet_id: int, account_id: int) -> BeerBet:
    bet = db.get(BeerBet, bet_id)
    if bet is None or account_id not in (bet.creator_id, bet.opponent_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bet not found")
    return bet


@router.get("/with/{friend_id}", response_model=list[BeerBetRead])
def list_bets_with_friend(
    friend_id: int,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> list[BeerBetRead]:
    _require_friend(db, account, friend_id)
    bets = (
        db.query(BeerBet)
        .filter(
            or_(
                (BeerBet.creator_id == account.id) & (BeerBet.opponent_id == friend_id),
                (BeerBet.creator_id == friend_id) & (BeerBet.opponent_id == account.id),
            )
        )
        .order_by(BeerBet.created_at.desc())
        .all()
    )
    return [_bet_read(bet, db) for bet in bets]


@router.get("/summary/{friend_id}", response_model=BeerBetSummary)
def get_summary_with_friend(
    friend_id: int,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> BeerBetSummary:
    _require_friend(db, account, friend_id)
    resolved = (
        db.query(BeerBet)
        .filter(
            BeerBet.status == BeerBetStatus.RESOLVED,
            or_(
                (BeerBet.creator_id == account.id) & (BeerBet.opponent_id == friend_id),
                (BeerBet.creator_id == friend_id) & (BeerBet.opponent_id == account.id),
            ),
        )
        .all()
    )
    net = 0
    for bet in resolved:
        if bet.winner_id == account.id:
            net += bet.stake
        elif bet.winner_id == friend_id:
            net -= bet.stake
    if net == 0:
        return BeerBetSummary(net_beers=0, owed_by=None)
    return BeerBetSummary(net_beers=abs(net), owed_by="them" if net > 0 else "me")


@router.post("/", response_model=BeerBetRead, status_code=status.HTTP_201_CREATED)
def create_bet(
    payload: BeerBetCreate,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> BeerBetRead:
    if payload.opponent_id == account.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot bet against yourself")
    if payload.stake < 1:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Stake must be at least 1")
    _require_friend(db, account, payload.opponent_id)

    bet = BeerBet(
        creator_id=account.id,
        opponent_id=payload.opponent_id,
        title=payload.title,
        description=payload.description,
        stake=payload.stake,
    )
    db.add(bet)
    db.commit()
    db.refresh(bet)
    return _bet_read(bet, db)


@router.post("/{bet_id}/confirm", response_model=BeerBetRead)
def confirm_bet(
    bet_id: int,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> BeerBetRead:
    bet = _get_bet_for_participant(db, bet_id, account.id)
    if bet.opponent_id != account.id or bet.status != BeerBetStatus.AWAITING_CONFIRMATION:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Bet cannot be confirmed")
    bet.status = BeerBetStatus.OPEN
    db.commit()
    db.refresh(bet)
    return _bet_read(bet, db)


@router.post("/{bet_id}/resolve", response_model=BeerBetRead)
def claim_winner(
    bet_id: int,
    payload: BeerBetResolve,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> BeerBetRead:
    """Claims a winner for an open bet — the other participant must confirm before it resolves."""
    bet = _get_bet_for_participant(db, bet_id, account.id)
    if bet.status != BeerBetStatus.OPEN:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only open bets can be resolved")
    if bet.claimed_winner_id is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Bet already has a pending claim")
    if payload.winner_id not in (bet.creator_id, bet.opponent_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Winner must be a participant")
    bet.claimed_winner_id = payload.winner_id
    bet.claimed_by_id = account.id
    db.commit()
    db.refresh(bet)
    return _bet_read(bet, db)


@router.post("/{bet_id}/confirm-winner", response_model=BeerBetRead)
def confirm_winner(
    bet_id: int,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> BeerBetRead:
    bet = _get_bet_for_participant(db, bet_id, account.id)
    if bet.status != BeerBetStatus.OPEN or bet.claimed_winner_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No pending claim to confirm")
    if account.id == bet.claimed_by_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The claimant cannot confirm their own claim")
    bet.status = BeerBetStatus.RESOLVED
    bet.winner_id = bet.claimed_winner_id
    bet.resolved_at = datetime.datetime.now(datetime.UTC)
    db.commit()
    db.refresh(bet)
    return _bet_read(bet, db)


@router.post("/{bet_id}/dispute-winner", response_model=BeerBetRead)
def dispute_winner(
    bet_id: int,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> BeerBetRead:
    """Rejects a pending claim, resetting the bet back to unclaimed (still open)."""
    bet = _get_bet_for_participant(db, bet_id, account.id)
    if bet.status != BeerBetStatus.OPEN or bet.claimed_winner_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No pending claim to dispute")
    if account.id == bet.claimed_by_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The claimant cannot dispute their own claim")
    bet.claimed_winner_id = None
    bet.claimed_by_id = None
    db.commit()
    db.refresh(bet)
    return _bet_read(bet, db)


@router.delete("/{bet_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_bet(
    bet_id: int,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> None:
    """Either participant can back out. Unconfirmed bets are deleted outright; open bets are kept
    around with a Cancelled status so the history stays visible."""
    bet = _get_bet_for_participant(db, bet_id, account.id)
    if bet.status == BeerBetStatus.AWAITING_CONFIRMATION:
        db.delete(bet)
        db.commit()
        return
    if bet.status == BeerBetStatus.OPEN:
        bet.status = BeerBetStatus.CANCELLED
        bet.cancelled_at = datetime.datetime.now(datetime.UTC)
        db.commit()
        return
    raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only awaiting or open bets can be cancelled")


@router.post("/cash-out/{friend_id}", response_model=BeerBetRead, status_code=status.HTTP_201_CREATED)
def cash_out(
    friend_id: int,
    payload: CashOutCreate,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> BeerBetRead:
    """Records that the friend already paid the caller back in beers, settling the balance
    immediately (no confirmation needed) rather than going through the usual bet lifecycle."""
    if payload.beers < 1:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Beers must be at least 1")
    _require_friend(db, account, friend_id)

    now = datetime.datetime.now(datetime.UTC)
    bet = BeerBet(
        creator_id=account.id,
        opponent_id=friend_id,
        title="Cash out",
        description=None,
        stake=payload.beers,
        status=BeerBetStatus.RESOLVED,
        winner_id=friend_id,
        is_settlement=True,
        created_at=now,
        resolved_at=now,
    )
    db.add(bet)
    db.commit()
    db.refresh(bet)
    return _bet_read(bet, db)
