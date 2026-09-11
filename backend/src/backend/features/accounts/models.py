"""SQLAlchemy models for the Microsoft account allowlist."""
import datetime
import enum

from sqlalchemy import Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class AccountStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"


class AllowedAccount(Base):
    __tablename__ = "allowed_accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True, nullable=False, index=True)
    display_name: Mapped[str | None] = mapped_column(nullable=True)
    status: Mapped[AccountStatus] = mapped_column(
        Enum(AccountStatus, native_enum=False, length=16),
        default=AccountStatus.PENDING,
        nullable=False,
    )
    is_admin: Mapped[bool] = mapped_column(default=False, nullable=False)
    nickname: Mapped[str | None] = mapped_column(nullable=True)
    # Hex colour used for the initials avatar (no persistent storage on Container Apps for uploads).
    avatar_color: Mapped[str] = mapped_column(default="#66B2FF", nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        default=lambda: datetime.datetime.now(datetime.UTC), nullable=False
    )


class AccountTileAccess(Base):
    """Grants a single account access to a single homepage tile/feature."""

    __tablename__ = "account_tile_access"

    account_id: Mapped[int] = mapped_column(
        ForeignKey("allowed_accounts.id", ondelete="CASCADE"), primary_key=True
    )
    tile_id: Mapped[int] = mapped_column(
        ForeignKey("tiles.id", ondelete="CASCADE"), primary_key=True
    )
