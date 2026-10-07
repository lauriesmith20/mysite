"""SQLAlchemy model for the shirt game's stored puzzles (one per day, kept as the game's history)."""
import datetime
from typing import Any

from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class ShirtPuzzle(Base):
    """A day's shirt, picked the first time it's asked for so everyone sees the same one, and kept as the
    game's history."""

    __tablename__ = "shirt_puzzles"

    id: Mapped[int] = mapped_column(primary_key=True)
    puzzle_date: Mapped[datetime.date] = mapped_column(unique=True, nullable=False)
    season: Mapped[str] = mapped_column(nullable=False)  # "2015-16"
    club: Mapped[str] = mapped_column(nullable=False)  # display name, e.g. "Leicester City"
    number: Mapped[int] = mapped_column(nullable=False)
    player: Mapped[str] = mapped_column(nullable=False)
    squad: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    season_options: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    # The club's kits that season: [{"type", "colours": {part: hex}, "base": {part: URL}, "patterns": {part: URL | None}}]
    kits: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        default=lambda: datetime.datetime.now(datetime.UTC), nullable=False
    )
