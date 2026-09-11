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

    # Plain add_column only — no batch_alter_table/rename/drop. Turso enforces foreign keys, and
    # batch mode's rebuild-the-table strategy (drop + recreate) trips a FOREIGN KEY constraint
    # failure there (h2h_game_score_history.game_id references h2h_games.id) even though the same
    # migration runs fine against a local sqlite file (FKs aren't enforced there by default).
    # laurie_score/maeve_score/player are left in place, unused, rather than risking that rebuild.
    op.add_column("h2h_games", sa.Column("creator_id", sa.Integer(), nullable=True))
    op.add_column("h2h_games", sa.Column("opponent_id", sa.Integer(), nullable=True))
    op.add_column("h2h_games", sa.Column("creator_score", sa.Integer(), nullable=True))
    op.add_column("h2h_games", sa.Column("opponent_score", sa.Integer(), nullable=True))
    op.add_column("h2h_game_score_history", sa.Column("player_id", sa.Integer(), nullable=True))

    if has_existing_games:
        conn.execute(
            sa.text(
                "UPDATE h2h_games SET creator_id = :laurie_id, opponent_id = :opponent_id, "
                "creator_score = laurie_score, opponent_score = maeve_score"
            ),
            {"laurie_id": laurie_id, "opponent_id": opponent_id},
        )
        conn.execute(
            sa.text(
                "UPDATE h2h_game_score_history SET player_id = "
                "CASE player WHEN 'laurie' THEN :laurie_id WHEN 'maeve' THEN :opponent_id END"
            ),
            {"laurie_id": laurie_id, "opponent_id": opponent_id},
        )
    else:
        conn.execute(sa.text("UPDATE h2h_games SET creator_score = 0, opponent_score = 0"))

    conn.execute(sa.text("UPDATE tiles SET title = 'H2H Games' WHERE href = '/game-scores'"))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    # Upgrade only ever added columns (never touched/dropped laurie_score/maeve_score/player), so
    # downgrading is just dropping what was added.
    op.drop_column("h2h_game_score_history", "player_id")
    op.drop_column("h2h_games", "creator_id")
    op.drop_column("h2h_games", "opponent_id")
    op.drop_column("h2h_games", "creator_score")
    op.drop_column("h2h_games", "opponent_score")

    conn.execute(sa.text("UPDATE tiles SET title = 'H2H: Maeve vs Laurie' WHERE href = '/game-scores'"))
