"""add daily game rivalry columns to h2h games

Revision ID: e7a9c3b1f205
Revises: d1bc19dfbe93
Create Date: 2026-10-06 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7a9c3b1f205'
down_revision: Union[str, Sequence[str], None] = 'd1bc19dfbe93'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Plain nullable columns (no table rebuild), so this is safe on Turso. Existing games keep NULLs
    # and stay ordinary manually-scored games.
    op.add_column('h2h_games', sa.Column('daily_game_key', sa.String(), nullable=True))
    op.add_column('h2h_games', sa.Column('challenge_status', sa.String(), nullable=True))
    op.add_column('h2h_games', sa.Column('accepted_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('h2h_games', 'accepted_at')
    op.drop_column('h2h_games', 'challenge_status')
    op.drop_column('h2h_games', 'daily_game_key')
