"""make the squad numbers tile public (the game works for guests)

Revision ID: c5f2a8d1e936
Revises: b3e8f1a7d052
Create Date: 2026-10-07 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5f2a8d1e936'
down_revision: Union[str, Sequence[str], None] = 'b3e8f1a7d052'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


tiles = sa.table("tiles", sa.column("href", sa.String), sa.column("is_public", sa.Boolean))


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    conn.execute(tiles.update().where(tiles.c.href == "/shirt-game").values(is_public=True))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    conn.execute(tiles.update().where(tiles.c.href == "/shirt-game").values(is_public=False))
