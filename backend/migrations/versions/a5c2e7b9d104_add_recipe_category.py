"""add recipe category

Revision ID: a5c2e7b9d104
Revises: c3d8e1f4a6b2
Create Date: 2026-10-05 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a5c2e7b9d104'
down_revision: Union[str, Sequence[str], None] = 'c3d8e1f4a6b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Every existing recipe starts as "other"; categories are set by hand afterwards.
    op.add_column(
        "recipes",
        sa.Column("category", sa.String(), nullable=False, server_default="other"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("recipes", "category")
