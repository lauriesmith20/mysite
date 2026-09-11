"""add beer bet claim fields

Revision ID: 1da2aae1cc85
Revises: f3a7c9e1d2b0
Create Date: 2026-09-11 15:09:30.326656

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1da2aae1cc85'
down_revision: Union[str, Sequence[str], None] = 'f3a7c9e1d2b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Plain columns (no FK) — SQLite can't ALTER TABLE to add FK constraints without a batch-mode
    # table rebuild, which errors here with a circular-dependency false positive.
    op.add_column("beer_bets", sa.Column("claimed_winner_id", sa.Integer(), nullable=True))
    op.add_column("beer_bets", sa.Column("claimed_by_id", sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("beer_bets", "claimed_by_id")
    op.drop_column("beer_bets", "claimed_winner_id")
