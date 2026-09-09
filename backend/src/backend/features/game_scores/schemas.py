"""Pydantic request/response models for head-to-head game score tracking."""
import datetime
from typing import Literal

from pydantic import BaseModel


class GameCreate(BaseModel):
    name: str
    image_url: str | None = None
    is_daily: bool = False


class GameUpdate(BaseModel):
    image_url: str | None = None
    is_daily: bool | None = None


class ScoreIncrement(BaseModel):
    player: Literal["laurie", "maeve"]
    delta: int = 1


class GameRead(BaseModel):
    id: int
    name: str
    image_url: str | None
    laurie_score: int
    maeve_score: int
    is_daily: bool
    last_updated: datetime.datetime | None

    model_config = {"from_attributes": True}
