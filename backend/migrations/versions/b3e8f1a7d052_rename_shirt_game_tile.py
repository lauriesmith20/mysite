"""rename shirt game tile to Squad Numbers

Revision ID: b3e8f1a7d052
Revises: a9d4e6b2c871
Create Date: 2026-10-07 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3e8f1a7d052'
down_revision: Union[str, Sequence[str], None] = 'a9d4e6b2c871'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


tiles = sa.table("tiles", sa.column("title", sa.String), sa.column("href", sa.String))


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    conn.execute(tiles.update().where(tiles.c.href == "/shirt-game").values(title="Squad Numbers"))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    conn.execute(tiles.update().where(tiles.c.href == "/shirt-game").values(title="Name the Shirt"))
