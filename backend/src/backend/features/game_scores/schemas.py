"""Pydantic request/response models for head-to-head game score tracking."""
import datetime

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

    model_config = {"from_attributes": True}


class ScoreHistoryRead(BaseModel):
    id: int
    player_id: int
    delta: int
    resulting_score: int
    changed_by: str
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
