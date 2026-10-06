"""Pydantic request/response models for head-to-head game score tracking."""
import datetime
from typing import Any, Literal

from pydantic import BaseModel

from backend.features.accounts.schemas import AccountSummary


class GameCreate(BaseModel):
    opponent_id: int
    name: str
    image_url: str | None = None
    is_daily: bool = False


class GameUpdate(BaseModel):
    image_url: str | None = None
    is_daily: bool | None = None


class ScoreIncrement(BaseModel):
    player_id: int
    delta: int = 1


class GameRead(BaseModel):
    id: int
    creator: AccountSummary
    opponent: AccountSummary
    name: str
    image_url: str | None
    creator_score: int
    opponent_score: int
    is_daily: bool
    last_updated: datetime.datetime | None
    #: Set for rivalries over a built-in daily game (scores then count days won), else null.
    daily_game_key: str | None = None
    #: For those rivalries: "pending" until the opponent accepts, then "accepted".
    challenge_status: str | None = None

    model_config = {"from_attributes": True}


class ChallengeCreate(BaseModel):
    opponent_id: int
    daily_game_key: str


class ChallengeAccept(BaseModel):
    #: The accepter's local date (YYYY-MM-DD): the rivalry counts from this puzzle day, so today
    #: counts even if it was already played. Defaults to today in UTC.
    local_date: datetime.date | None = None


class ChallengeRead(BaseModel):
    """A pending challenge waiting for the caller to accept or decline."""

    id: int
    daily_game_key: str
    title: str
    challenger: AccountSummary


class DayResult(BaseModel):
    score: int
    outcome: Literal["won", "lost"]
    #: Game-specific extras, e.g. lives left and hops for Country Hopper.
    details: dict[str, Any]


class DayRead(BaseModel):
    """One puzzle day of a daily-game rivalry, from the caller's point of view."""

    puzzle_date: datetime.date
    mine: DayResult | None
    #: The other player's result: only revealed once the caller has finished that day.
    theirs: DayResult | None
    their_played: bool
    #: Null until both have played (and, for the caller, until they've finished).
    winner: Literal["me", "them", "draw"] | None
    #: What settled it when it wasn't a draw: e.g. "suitcases", "lives" or "hops".
    decided_by: str | None


class ScoreHistoryRead(BaseModel):
    id: int
    player_id: int
    delta: int
    resulting_score: int
    changed_by: str
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class RivalToday(BaseModel):
    """A rival's standing on one puzzle day, as seen by someone who has finished that day."""

    game_id: int
    friend: AccountSummary
    friend_played: bool
    #: Only included once the caller has finished that day themselves.
    friend_result: DayResult | None
