"""seed default tiles

Revision ID: 65ba62b7e0c5
Revises: e9090a9df533
Create Date: 2026-09-11 14:18:59.795222

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '65ba62b7e0c5'
down_revision: Union[str, Sequence[str], None] = 'e9090a9df533'
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
    # Moved out of main.py's import-time code: that ran on every cold start (an extra DB
    # round-trip per boot), whereas a migration only runs once, when deployed.
    conn = op.get_bind()
    existing = {row[0] for row in conn.execute(sa.select(tiles.c.href))}
    rows = []
    if "/game-scores" not in existing:
        rows.append({"title": "H2H: Maeve vs Laurie", "href": "/game-scores", "color": "#ed3e5b", "icon": "swords"})
    if "/recipes" not in existing:
        rows.append({"title": "Recipes", "href": "/recipes", "color": "#f2994a", "icon": "chef-hat"})
    if rows:
        op.bulk_insert(tiles, rows)


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    conn.execute(
        tiles.delete().where(tiles.c.href.in_(["/game-scores", "/recipes"]))
    )
