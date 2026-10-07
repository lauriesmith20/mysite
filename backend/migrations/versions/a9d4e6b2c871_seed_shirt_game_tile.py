"""seed shirt game tile

Revision ID: a9d4e6b2c871
Revises: cdf730afc388
Create Date: 2026-10-07 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9d4e6b2c871'
down_revision: Union[str, Sequence[str], None] = 'cdf730afc388'
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
    if "/shirt-game" not in existing:
        op.bulk_insert(
            tiles,
            [{"title": "Name the Shirt", "href": "/shirt-game", "color": "#4CB87B", "icon": "shirt"}],
        )


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    conn.execute(tiles.delete().where(tiles.c.href == "/shirt-game"))
