"""SQLAlchemy models for homepage navigation tiles."""
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class Tile(Base):
    __tablename__ = "tiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(nullable=False)
    href: Mapped[str] = mapped_column(nullable=False)
    color: Mapped[str] = mapped_column(nullable=False)
    icon: Mapped[str | None] = mapped_column(nullable=True)
