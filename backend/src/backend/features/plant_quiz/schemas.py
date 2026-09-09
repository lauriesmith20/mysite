"""Pydantic request/response models for the Plant Quiz feature."""
from pydantic import BaseModel, Field

from backend.features.plant_quiz.data import PLANTS


class PlantRead(BaseModel):
    name: str
    img: str


class ScoreIn(BaseModel):
    correct: int = Field(..., ge=0, le=10)
    total: int = Field(..., ge=1, le=10)


class ScoreBigIn(BaseModel):
    score: int = Field(..., ge=0, le=len(PLANTS))


class LeaderboardEntry(BaseModel):
    player_name: str
    avg_score: float
    games_played: int


class BigLeaderboardEntry(BaseModel):
    player_name: str
    best_score: int
    attempts: int
