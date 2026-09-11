"""SQLAlchemy models for head-to-head game score tracking between friends."""
import datetime

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class Game(Base):
    __tablename__ = "h2h_games"

    id: Mapped[int] = mapped_column(primary_key=True)
    creator_id: Mapped[int] = mapped_column(
        ForeignKey("allowed_accounts.id", ondelete="CASCADE"), nullable=False
    )
    opponent_id: Mapped[int] = mapped_column(
        ForeignKey("allowed_accounts.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(nullable=False)
    image_url: Mapped[str | None] = mapped_column(nullable=True)
    creator_score: Mapped[int] = mapped_column(default=0, nullable=False)
    opponent_score: Mapped[int] = mapped_column(default=0, nullable=False)
    is_daily: Mapped[bool] = mapped_column(default=False, nullable=False)
    last_updated: Mapped[datetime.datetime | None] = mapped_column(nullable=True)
    # Legacy NOT NULL columns from before creator/opponent accounts existed, kept in place (rather
    # than dropped via a Turso-unsafe batch table rebuild) — still need a value on every insert.
    laurie_score: Mapped[int] = mapped_column(default=0)
    maeve_score: Mapped[int] = mapped_column(default=0)


class GameScoreHistory(Base):
    __tablename__ = "h2h_game_score_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("h2h_games.id"), nullable=False)
    player_id: Mapped[int] = mapped_column(ForeignKey("allowed_accounts.id"), nullable=False)
    delta: Mapped[int] = mapped_column(nullable=False)
    resulting_score: Mapped[int] = mapped_column(nullable=False)
    changed_by: Mapped[str] = mapped_column(nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(nullable=False)
    # Legacy NOT NULL column from before creator/opponent accounts existed, kept in place (rather
    # than dropped via a Turso-unsafe batch table rebuild) — still needs a value on every insert.
    player: Mapped[str] = mapped_column(default="")
