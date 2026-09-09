"""add tiles and h2h_games tables

Revision ID: 70318725edaa
Revises:
Create Date: 2026-09-09 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '70318725edaa'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Baseline migration: these tables predate Alembic and were originally created via
    # Base.metadata.create_all(), so there was never an initial migration for them.
    op.create_table(
        'tiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('href', sa.String(), nullable=False),
        sa.Column('color', sa.String(), nullable=False),
        sa.Column('icon', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'h2h_games',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('image_url', sa.String(), nullable=True),
        sa.Column('laurie_score', sa.Integer(), nullable=False),
        sa.Column('maeve_score', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('h2h_games')
    op.drop_table('tiles')
