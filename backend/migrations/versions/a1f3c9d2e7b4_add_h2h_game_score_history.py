"""add h2h game score history table

Revision ID: a1f3c9d2e7b4
Revises: 3034c4a12f9f
Create Date: 2026-09-09 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1f3c9d2e7b4'
down_revision: Union[str, Sequence[str], None] = '3034c4a12f9f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'h2h_game_score_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('game_id', sa.Integer(), nullable=False),
        sa.Column('player', sa.String(), nullable=False),
        sa.Column('delta', sa.Integer(), nullable=False),
        sa.Column('resulting_score', sa.Integer(), nullable=False),
        sa.Column('changed_by', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['game_id'], ['h2h_games.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('h2h_game_score_history')
