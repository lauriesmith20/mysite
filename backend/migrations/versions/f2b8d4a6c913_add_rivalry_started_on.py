"""add started_on to h2h games

Revision ID: f2b8d4a6c913
Revises: e7a9c3b1f205
Create Date: 2026-10-06 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2b8d4a6c913'
down_revision: Union[str, Sequence[str], None] = 'e7a9c3b1f205'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Nullable, no table rebuild (Turso-safe). Rivalries accepted before this existed have NULL and
    # fall back to the date they were accepted, so they pick up that whole day.
    op.add_column('h2h_games', sa.Column('started_on', sa.Date(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('h2h_games', 'started_on')
