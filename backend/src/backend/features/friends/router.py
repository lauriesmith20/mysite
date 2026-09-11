"""Routes for friend connections between approved accounts."""
import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.auth import require_approved_account
from backend.database import get_db
from backend.features.accounts.models import AccountStatus, AllowedAccount
from backend.features.accounts.schemas import AccountSummary
from backend.features.friends.models import Friendship, FriendshipStatus
from backend.features.friends.schemas import (
    DirectoryEntry,
    FriendRead,
    FriendRequestCreate,
    FriendRequestRead,
)

router = APIRouter(prefix="/api/friends", tags=["friends"])


def _friend_read(account: AllowedAccount, friendship_id: int) -> FriendRead:
    return FriendRead(**AccountSummary.model_validate(account).model_dump(), friendship_id=friendship_id)


def _directory_entry(account: AllowedAccount, relation: str) -> DirectoryEntry:
    return DirectoryEntry(**AccountSummary.model_validate(account).model_dump(), relation=relation)


def _request_read(friendship: Friendship, requester: AllowedAccount) -> FriendRequestRead:
    return FriendRequestRead(
        id=friendship.id,
        requester=AccountSummary.model_validate(requester),
        created_at=friendship.created_at,
    )


def _existing_friendship(db: Session, account_a: int, account_b: int) -> Friendship | None:
    return (
        db.query(Friendship)
        .filter(
            or_(
                (Friendship.requester_id == account_a) & (Friendship.addressee_id == account_b),
                (Friendship.requester_id == account_b) & (Friendship.addressee_id == account_a),
            )
        )
        .first()
    )


@router.get("/", response_model=list[FriendRead])
def list_friends(
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> list[FriendRead]:
    rows = (
        db.query(Friendship)
        .filter(
            Friendship.status == FriendshipStatus.ACCEPTED,
            or_(Friendship.requester_id == account.id, Friendship.addressee_id == account.id),
        )
        .all()
    )
    friend_ids = [
        row.addressee_id if row.requester_id == account.id else row.requester_id for row in rows
    ]
    accounts_by_id = {
        a.id: a
        for a in db.query(AllowedAccount).filter(AllowedAccount.id.in_(friend_ids)).all()
    }
    return [
        _friend_read(accounts_by_id[fid], row.id)
        for row, fid in zip(rows, friend_ids)
        if fid in accounts_by_id
    ]


@router.get("/requests", response_model=list[FriendRequestRead])
def list_incoming_requests(
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> list[FriendRequestRead]:
    rows = list(
        db.query(Friendship)
        .filter(
            Friendship.addressee_id == account.id,
            Friendship.status == FriendshipStatus.PENDING,
        )
        .order_by(Friendship.created_at.desc())
        .all()
    )
    requesters = {
        a.id: a
        for a in db.query(AllowedAccount)
        .filter(AllowedAccount.id.in_([row.requester_id for row in rows]))
        .all()
    }
    return [_request_read(row, requesters[row.requester_id]) for row in rows if row.requester_id in requesters]


@router.get("/directory", response_model=list[DirectoryEntry])
def list_directory(
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> list[DirectoryEntry]:
    """All other approved accounts, annotated with the caller's relation to each."""
    others = (
        db.query(AllowedAccount)
        .filter(AllowedAccount.status == AccountStatus.APPROVED, AllowedAccount.id != account.id)
        .order_by(AllowedAccount.display_name)
        .all()
    )
    friendships = (
        db.query(Friendship)
        .filter(or_(Friendship.requester_id == account.id, Friendship.addressee_id == account.id))
        .all()
    )
    relation_by_other_id: dict[int, str] = {}
    for f in friendships:
        other_id = f.addressee_id if f.requester_id == account.id else f.requester_id
        if f.status == FriendshipStatus.ACCEPTED:
            relation_by_other_id[other_id] = "friends"
        elif f.status == FriendshipStatus.PENDING:
            relation_by_other_id[other_id] = (
                "outgoing_request" if f.requester_id == account.id else "incoming_request"
            )
    return [_directory_entry(other, relation_by_other_id.get(other.id, "none")) for other in others]


@router.post("/", response_model=FriendRequestRead, status_code=status.HTTP_201_CREATED)
def send_friend_request(
    payload: FriendRequestCreate,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> FriendRequestRead:
    if payload.addressee_id == account.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot friend yourself")
    addressee = db.get(AllowedAccount, payload.addressee_id)
    if addressee is None or addressee.status != AccountStatus.APPROVED:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")

    existing = _existing_friendship(db, account.id, payload.addressee_id)
    if existing is not None and existing.status != FriendshipStatus.DECLINED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Friendship already requested or exists")
    if existing is not None:
        # Re-request after a previous decline.
        existing.requester_id = account.id
        existing.addressee_id = payload.addressee_id
        existing.status = FriendshipStatus.PENDING
        existing.created_at = datetime.datetime.now(datetime.UTC)
        existing.responded_at = None
        db.commit()
        db.refresh(existing)
        return _request_read(existing, account)

    friendship = Friendship(requester_id=account.id, addressee_id=payload.addressee_id)
    db.add(friendship)
    db.commit()
    db.refresh(friendship)
    return _request_read(friendship, account)


@router.post("/requests/{friendship_id}/accept", response_model=FriendRead)
def accept_friend_request(
    friendship_id: int,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> FriendRead:
    friendship = db.get(Friendship, friendship_id)
    if (
        friendship is None
        or friendship.addressee_id != account.id
        or friendship.status != FriendshipStatus.PENDING
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Friend request not found")
    friendship.status = FriendshipStatus.ACCEPTED
    friendship.responded_at = datetime.datetime.now(datetime.UTC)
    db.commit()
    requester = db.get(AllowedAccount, friendship.requester_id)
    assert requester is not None
    return _friend_read(requester, friendship.id)


@router.post("/requests/{friendship_id}/decline", status_code=status.HTTP_204_NO_CONTENT)
def decline_friend_request(
    friendship_id: int,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> None:
    friendship = db.get(Friendship, friendship_id)
    if (
        friendship is None
        or friendship.addressee_id != account.id
        or friendship.status != FriendshipStatus.PENDING
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Friend request not found")
    friendship.status = FriendshipStatus.DECLINED
    friendship.responded_at = datetime.datetime.now(datetime.UTC)
    db.commit()


@router.delete("/{friendship_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_friend(
    friendship_id: int,
    account: AllowedAccount = Depends(require_approved_account),
    db: Session = Depends(get_db),
) -> None:
    friendship = db.get(Friendship, friendship_id)
    if friendship is None or account.id not in (friendship.requester_id, friendship.addressee_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Friendship not found")
    db.delete(friendship)
    db.commit()
