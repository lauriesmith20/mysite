"""SQLAlchemy models for beer bets between friends."""
import datetime
import enum

from sqlalchemy import Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class BeerBetStatus(str, enum.Enum):
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    OPEN = "open"
    RESOLVED = "resolved"
    CANCELLED = "cancelled"


class BeerBet(Base):
    __tablename__ = "beer_bets"

    id: Mapped[int] = mapped_column(primary_key=True)
    creator_id: Mapped[int] = mapped_column(
        ForeignKey("allowed_accounts.id", ondelete="CASCADE"), nullable=False
    )
    opponent_id: Mapped[int] = mapped_column(
        ForeignKey("allowed_accounts.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str | None] = mapped_column(nullable=True)
    stake: Mapped[int] = mapped_column(default=1, nullable=False)
    status: Mapped[BeerBetStatus] = mapped_column(
        Enum(BeerBetStatus, native_enum=False, length=24),
        default=BeerBetStatus.AWAITING_CONFIRMATION,
        nullable=False,
    )
    winner_id: Mapped[int | None] = mapped_column(
        ForeignKey("allowed_accounts.id", ondelete="SET NULL"), nullable=True
    )
    # Set when one participant claims a winner on an open bet; cleared on dispute, and copied to
    # winner_id once the other participant confirms. Plain ints (no FK) to sidestep SQLite's lack
    # of ALTER-time FK support without a risky batch-mode table rebuild.
    claimed_winner_id: Mapped[int | None] = mapped_column(nullable=True)
    claimed_by_id: Mapped[int | None] = mapped_column(nullable=True)
    # True for bets created via the "cash out" shortcut (an already-settled real-life payment)
    # rather than a raised bet that goes through the usual confirm/claim flow.
    is_settlement: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        default=lambda: datetime.datetime.now(datetime.UTC), nullable=False
    )
    resolved_at: Mapped[datetime.datetime | None] = mapped_column(nullable=True)
    cancelled_at: Mapped[datetime.datetime | None] = mapped_column(nullable=True)
