"""SQLAlchemy models for the plant quiz scores."""
import datetime

from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class PlantQuizScore(Base):
    """A single Normal Quiz (10 questions) attempt."""

    __tablename__ = "plant_quiz_scores"

    id: Mapped[int] = mapped_column(primary_key=True)
    player_name: Mapped[str] = mapped_column(nullable=False)
    correct: Mapped[int] = mapped_column(nullable=False)
    total: Mapped[int] = mapped_column(nullable=False)
    played_at: Mapped[datetime.datetime] = mapped_column(
        default=lambda: datetime.datetime.now(datetime.UTC), nullable=False
    )


class PlantQuizBigScore(Base):
    """A single Big Quiz (all plants) attempt."""

    __tablename__ = "plant_quiz_big_scores"

    id: Mapped[int] = mapped_column(primary_key=True)
    player_name: Mapped[str] = mapped_column(nullable=False)
    score: Mapped[int] = mapped_column(nullable=False)
    played_at: Mapped[datetime.datetime] = mapped_column(
        default=lambda: datetime.datetime.now(datetime.UTC), nullable=False
    )
