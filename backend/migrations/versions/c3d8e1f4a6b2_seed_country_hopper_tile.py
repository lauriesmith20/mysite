"""add tiles.is_public and seed country hopper tile

Revision ID: c3d8e1f4a6b2
Revises: b7e2d5a9c3f1
Create Date: 2026-10-04 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d8e1f4a6b2'
down_revision: Union[str, Sequence[str], None] = 'b7e2d5a9c3f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


tiles = sa.table(
    "tiles",
    sa.column("title", sa.String),
    sa.column("href", sa.String),
    sa.column("color", sa.String),
    sa.column("icon", sa.String),
    sa.column("is_public", sa.Boolean),
)


def upgrade() -> None:
    """Upgrade schema."""
    # Plain column add (no batch rebuild) so it is safe on Turso.
    op.add_column("tiles", sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.false()))
    conn = op.get_bind()
    existing = {row[0] for row in conn.execute(sa.select(tiles.c.href))}
    if "/country-hopper" not in existing:
        op.bulk_insert(
            tiles,
            [{"title": "Country Hopper", "href": "/country-hopper", "color": "#8ec9f0", "icon": "route", "is_public": True}],
        )


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    conn.execute(tiles.delete().where(tiles.c.href == "/country-hopper"))
    op.drop_column("tiles", "is_public")
