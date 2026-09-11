"""SQLAlchemy models for friend connections."""
import datetime
import enum

from sqlalchemy import Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class FriendshipStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (UniqueConstraint("requester_id", "addressee_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    requester_id: Mapped[int] = mapped_column(
        ForeignKey("allowed_accounts.id", ondelete="CASCADE"), nullable=False
    )
    addressee_id: Mapped[int] = mapped_column(
        ForeignKey("allowed_accounts.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[FriendshipStatus] = mapped_column(
        Enum(FriendshipStatus, native_enum=False, length=16),
        default=FriendshipStatus.PENDING,
        nullable=False,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        default=lambda: datetime.datetime.now(datetime.UTC), nullable=False
    )
    responded_at: Mapped[datetime.datetime | None] = mapped_column(nullable=True)
