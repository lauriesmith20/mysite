"""generalize h2h games to creator/opponent accounts

Revision ID: d4a6f0e2b8c1
Revises: c47a0d16585c
Create Date: 2026-09-11 16:30:00.000000

"""
import os
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4a6f0e2b8c1'
down_revision: Union[str, Sequence[str], None] = 'c47a0d16585c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Laurie's account is used to attribute existing h2h_games rows to him as "creator" — the other
# participant ("opponent") is resolved dynamically below rather than committing their email here.
LAURIE_EMAIL = "lauriesmith20@hotmail.co.uk"


def _laurie_id(conn: sa.engine.Connection) -> int:
    row = conn.execute(
        sa.text("SELECT id FROM allowed_accounts WHERE email = :email"), {"email": LAURIE_EMAIL}
    ).first()
    if row is None:
        raise RuntimeError(f"No allowed_accounts row found for {LAURIE_EMAIL}")
    return row[0]


def _opponent_id(conn: sa.engine.Connection, laurie_id: int) -> int:
    """Resolves the other real user's account id without hardcoding their email in the repo.

    Set the H2H_OPPONENT_EMAIL env var to their email when running this migration if it can't be
    inferred automatically (e.g. more than one other approved account exists).
    """
    override_email = os.environ.get("H2H_OPPONENT_EMAIL")
    if override_email:
        row = conn.execute(
            sa.text("SELECT id FROM allowed_accounts WHERE email = :email"), {"email": override_email}
        ).first()
        if row is not None:
            return row[0]

    candidates = conn.execute(
        sa.text(
            "SELECT id FROM allowed_accounts WHERE id != :laurie_id AND status = 'APPROVED' "
            "ORDER BY created_at"
        ),
        {"laurie_id": laurie_id},
    ).fetchall()
    if len(candidates) != 1:
        raise RuntimeError(
            f"Expected exactly one other approved account, found {len(candidates)}. "
            "Set the H2H_OPPONENT_EMAIL env var to the correct email before running this migration."
        )
    return candidates[0][0]


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    has_existing_games = conn.execute(sa.text("SELECT COUNT(*) FROM h2h_games")).scalar_one() > 0

    # Resolved before any DDL runs: SQLite DDL isn't transactional, so failing here (e.g.
    # ambiguous accounts) must not leave partially-added columns behind for a retry to trip over.
    laurie_id = opponent_id = None
    if has_existing_games:
        laurie_id = _laurie_id(conn)
        opponent_id = _opponent_id(conn, laurie_id)

    op.add_column("h2h_games", sa.Column("creator_id", sa.Integer(), nullable=True))
    op.add_column("h2h_games", sa.Column("opponent_id", sa.Integer(), nullable=True))
    op.add_column("h2h_game_score_history", sa.Column("player_id", sa.Integer(), nullable=True))

    if has_existing_games:
        conn.execute(
            sa.text("UPDATE h2h_games SET creator_id = :laurie_id, opponent_id = :opponent_id"),
            {"laurie_id": laurie_id, "opponent_id": opponent_id},
        )
        conn.execute(
            sa.text(
                "UPDATE h2h_game_score_history SET player_id = "
                "CASE player WHEN 'laurie' THEN :laurie_id WHEN 'maeve' THEN :opponent_id END"
            ),
            {"laurie_id": laurie_id, "opponent_id": opponent_id},
        )

    with op.batch_alter_table("h2h_games") as batch_op:
        batch_op.alter_column("creator_id", nullable=False)
        batch_op.alter_column("opponent_id", nullable=False)
        batch_op.alter_column("laurie_score", new_column_name="creator_score")
        batch_op.alter_column("maeve_score", new_column_name="opponent_score")

    with op.batch_alter_table("h2h_game_score_history") as batch_op:
        batch_op.alter_column("player_id", nullable=False)
        batch_op.drop_column("player")

    conn.execute(sa.text("UPDATE tiles SET title = 'H2H Games' WHERE href = '/game-scores'"))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    op.add_column("h2h_game_score_history", sa.Column("player", sa.String(), nullable=True))
    conn.execute(
        sa.text(
            "UPDATE h2h_game_score_history SET player = ("
            "  SELECT CASE WHEN h.creator_id = h2h_game_score_history.player_id THEN 'laurie' ELSE 'maeve' END "
            "  FROM h2h_games h WHERE h.id = h2h_game_score_history.game_id"
            ")"
        )
    )
    with op.batch_alter_table("h2h_game_score_history") as batch_op:
        batch_op.alter_column("player", nullable=False)
        batch_op.drop_column("player_id")

    with op.batch_alter_table("h2h_games") as batch_op:
        batch_op.alter_column("creator_score", new_column_name="laurie_score")
        batch_op.alter_column("opponent_score", new_column_name="maeve_score")
        batch_op.drop_column("creator_id")
        batch_op.drop_column("opponent_id")

    conn.execute(sa.text("UPDATE tiles SET title = 'H2H: Maeve vs Laurie' WHERE href = '/game-scores'"))
