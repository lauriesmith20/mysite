"""add shirt puzzles table

Revision ID: cdf730afc388
Revises: f2b8d4a6c913
Create Date: 2026-10-07 13:45:03.419536

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cdf730afc388'
down_revision: Union[str, Sequence[str], None] = 'f2b8d4a6c913'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('shirt_puzzles',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('puzzle_date', sa.Date(), nullable=False),
    sa.Column('season', sa.String(), nullable=False),
    sa.Column('club', sa.String(), nullable=False),
    sa.Column('number', sa.Integer(), nullable=False),
    sa.Column('player', sa.String(), nullable=False),
    sa.Column('squad', sa.JSON(), nullable=False),
    sa.Column('season_options', sa.JSON(), nullable=False),
    sa.Column('kits', sa.JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('puzzle_date')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('shirt_puzzles')
