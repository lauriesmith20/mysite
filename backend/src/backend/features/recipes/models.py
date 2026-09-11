"""SQLAlchemy models for the recipes feature."""
import datetime

from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class Recipe(Base):
    __tablename__ = "recipes"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(nullable=False)
    image_url: Mapped[str | None] = mapped_column(nullable=True)
    description: Mapped[str] = mapped_column(nullable=False)
    servings: Mapped[int | None] = mapped_column(nullable=True)
    # Structured as list[{"name": str, "amount": float | None, "unit": str | None}], see schemas.Ingredient.
    ingredients: Mapped[list[dict]] = mapped_column(JSON, nullable=False)
    steps: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    notes: Mapped[str | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        default=lambda: datetime.datetime.now(datetime.UTC), nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        default=lambda: datetime.datetime.now(datetime.UTC),
        onupdate=lambda: datetime.datetime.now(datetime.UTC),
        nullable=False,
    )
