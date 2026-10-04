"""SQLAlchemy models for homepage navigation tiles."""
from sqlalchemy import false
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class Tile(Base):
    __tablename__ = "tiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(nullable=False)
    href: Mapped[str] = mapped_column(nullable=False)
    color: Mapped[str] = mapped_column(nullable=False)
    icon: Mapped[str | None] = mapped_column(nullable=True)
    # Guest-friendly tiles: shown to signed-out visitors and to every signed-in account (no grant needed).
    is_public: Mapped[bool] = mapped_column(nullable=False, default=False, server_default=false())
