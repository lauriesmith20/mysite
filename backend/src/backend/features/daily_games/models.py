"""SQLAlchemy models for results of once-a-day puzzle games (Country Hopper and future ones)."""
import datetime
from typing import Any

from sqlalchemy import JSON, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class DailyGameResult(Base):
    """One account's finished attempt at one game's puzzle for one day.

    Generic across games: `score` is a number from 0 to the game's max score (see registry.py) and
    `details` holds whatever extra the game wants to show or restore (e.g. the route taken).
    """

    __tablename__ = "daily_game_results"
    __table_args__ = (UniqueConstraint("account_id", "game_key", "puzzle_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("allowed_accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    game_key: Mapped[str] = mapped_column(nullable=False, index=True)
    # The puzzle's calendar date as the player saw it (their local date), not when it was submitted.
    puzzle_date: Mapped[datetime.date] = mapped_column(nullable=False)
    score: Mapped[int] = mapped_column(nullable=False)
    outcome: Mapped[str] = mapped_column(nullable=False)  # "won" | "lost"
    details: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime.datetime] = mapped_column(
        default=lambda: datetime.datetime.now(datetime.UTC), nullable=False
    )
