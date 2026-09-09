"""update h2h tile color

Revision ID: 3034c4a12f9f
Revises: ec6f01ac6169
Create Date: 2026-09-09 13:18:02.266356

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3034c4a12f9f'
down_revision: Union[str, Sequence[str], None] = 'ec6f01ac6169'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("UPDATE tiles SET color = '#ed3e5b' WHERE href = '/game-scores'")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("UPDATE tiles SET color = '#B9E0A5' WHERE href = '/game-scores'")
