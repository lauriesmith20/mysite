"""Pydantic request/response models for daily game results."""
import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ResultIn(BaseModel):
    puzzle_date: datetime.date
    score: int = Field(ge=0)
    outcome: Literal["won", "lost"]
    #: Game-specific extras (shown in history, used to restore the finished game). Kept small.
    details: dict[str, Any] = Field(default_factory=dict)


class ResultRead(BaseModel):
    id: int
    game_key: str
    puzzle_date: datetime.date
    score: int
    outcome: Literal["won", "lost"]
    details: dict[str, Any]
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
