"""seed beer bets tile

Revision ID: f3a7c9e1d2b0
Revises: b8278ac8b184
Create Date: 2026-09-11 15:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a7c9e1d2b0'
down_revision: Union[str, Sequence[str], None] = 'b8278ac8b184'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


tiles = sa.table(
    "tiles",
    sa.column("title", sa.String),
    sa.column("href", sa.String),
    sa.column("color", sa.String),
    sa.column("icon", sa.String),
)


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    existing = {row[0] for row in conn.execute(sa.select(tiles.c.href))}
    if "/beer-bets" not in existing:
        op.bulk_insert(
            tiles,
            [{"title": "Beer Bets", "href": "/beer-bets", "color": "#f2c94c", "icon": "beer"}],
        )


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    conn.execute(tiles.delete().where(tiles.c.href == "/beer-bets"))
