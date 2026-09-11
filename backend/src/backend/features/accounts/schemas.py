"""Pydantic request/response models for the Microsoft account allowlist."""
import datetime

from pydantic import BaseModel

from backend.features.accounts.models import AccountStatus


class AccountRead(BaseModel):
    id: int
    email: str
    display_name: str | None
    nickname: str | None
    avatar_color: str
    status: AccountStatus
    is_admin: bool
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class AccountUpdate(BaseModel):
    status: AccountStatus | None = None
    is_admin: bool | None = None


class TileAccessUpdate(BaseModel):
    tile_ids: list[int]


class MeRead(BaseModel):
    id: int
    email: str
    display_name: str | None
    nickname: str | None
    avatar_color: str
    status: AccountStatus
    is_admin: bool

    model_config = {"from_attributes": True}


class MeUpdate(BaseModel):
    nickname: str | None = None
    avatar_color: str | None = None


class AccountSummary(BaseModel):
    """Minimal public-facing account info, used by the friends/beer-bets features."""

    id: int
    email: str
    display_name: str | None
    nickname: str | None
    avatar_color: str

    model_config = {"from_attributes": True}
