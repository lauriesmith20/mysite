"""Pydantic request/response models for beer bets."""
import datetime

from pydantic import BaseModel

from backend.features.accounts.schemas import AccountSummary
from backend.features.beer_bets.models import BeerBetStatus


class BeerBetCreate(BaseModel):
    opponent_id: int
    title: str
    description: str | None = None
    stake: int = 1


class BeerBetResolve(BaseModel):
    winner_id: int


class CashOutCreate(BaseModel):
    beers: int


class BeerBetRead(BaseModel):
    id: int
    creator: AccountSummary
    opponent: AccountSummary
    title: str
    description: str | None
    stake: int
    status: BeerBetStatus
    winner_id: int | None
    claimed_winner_id: int | None
    claimed_by_id: int | None
    is_settlement: bool
    created_at: datetime.datetime
    resolved_at: datetime.datetime | None
    cancelled_at: datetime.datetime | None

    model_config = {"from_attributes": True}


class BeerBetSummary(BaseModel):
    """Net beers owed between the caller and a given friend, from resolved bets."""

    net_beers: int
    owed_by: str | None  # "me" | "them" | None (all square)
