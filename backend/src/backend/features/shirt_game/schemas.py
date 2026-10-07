"""Pydantic request/response models for the shirt game."""
import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class PuzzleRead(BaseModel):
    """What's needed to play: the shirt and the options, but not the answers."""

    puzzle_date: datetime.date
    number: int
    #: The club's kits that season: [{"type", "colours": {part: hex}, "base": {part: URL}, "patterns": {part: URL | None}}]
    kits: list[dict[str, Any]]
    teams: list[str]
    season_options: list[str]


class GuessIn(BaseModel):
    stage: Literal["team", "season", "player"]
    value: str = Field(min_length=1, max_length=100)


class GuessRead(BaseModel):
    correct: bool
    #: The answer to that stage, only once it's been guessed right.
    answer: str | None = None
    #: The squad for the right team and season, handed out once the season has been guessed.
    squad: list[str] | None = None


class AnswerRead(BaseModel):
    """All the answers, available once you've finished the day."""

    team: str
    season: str
    player: str
    squad: list[str]
