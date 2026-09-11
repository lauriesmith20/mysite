"""Pydantic request/response models for friend connections."""
import datetime
from typing import Literal

from pydantic import BaseModel

from backend.features.accounts.schemas import AccountSummary

RelationStatus = Literal["none", "friends", "outgoing_request", "incoming_request"]


class FriendRequestCreate(BaseModel):
    addressee_id: int


class FriendRead(AccountSummary):
    """The other account in an accepted friendship."""

    friendship_id: int


class FriendRequestRead(BaseModel):
    id: int
    requester: AccountSummary
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class DirectoryEntry(AccountSummary):
    relation: RelationStatus
