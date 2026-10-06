"""add daily game results

Revision ID: d1bc19dfbe93
Revises: a5c2e7b9d104
Create Date: 2026-10-06 13:41:02.150848

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1bc19dfbe93'
down_revision: Union[str, Sequence[str], None] = 'a5c2e7b9d104'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Only the new table: autogenerate also proposed altering the h2h tables, but those are old
    # drift (and table rebuilds aren't Turso-safe), so they're deliberately left out.
    op.create_table('daily_game_results',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('account_id', sa.Integer(), nullable=False),
    sa.Column('game_key', sa.String(), nullable=False),
    sa.Column('puzzle_date', sa.Date(), nullable=False),
    sa.Column('score', sa.Integer(), nullable=False),
    sa.Column('outcome', sa.String(), nullable=False),
    sa.Column('details', sa.JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['account_id'], ['allowed_accounts.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('account_id', 'game_key', 'puzzle_date')
    )
    op.create_index(op.f('ix_daily_game_results_account_id'), 'daily_game_results', ['account_id'], unique=False)
    op.create_index(op.f('ix_daily_game_results_game_key'), 'daily_game_results', ['game_key'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_daily_game_results_game_key'), table_name='daily_game_results')
    op.drop_index(op.f('ix_daily_game_results_account_id'), table_name='daily_game_results')
    op.drop_table('daily_game_results')
