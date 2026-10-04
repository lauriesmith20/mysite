"""add recipe step_details

Revision ID: b7e2d5a9c3f1
Revises: d4a6f0e2b8c1
Create Date: 2026-10-04 14:00:00.000000

"""
import json
import re
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e2d5a9c3f1'
down_revision: Union[str, Sequence[str], None] = 'd4a6f0e2b8c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_DURATION = re.compile(r"(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b", re.I)


def _timer_seconds(step: str) -> int | None:
    """Best-effort: the first explicit duration in the step text, e.g. 'simmer for 10 minutes'."""
    match = _DURATION.search(step)
    if not match:
        return None
    unit = match.group(2).lower()
    factor = 3600 if unit.startswith("h") else 60 if unit.startswith("m") else 1
    return int(float(match.group(1)) * factor)


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("recipes", sa.Column("step_details", sa.JSON(), nullable=True))

    # Backfill existing recipes so cooking mode has timers/ingredients straight away.
    conn = op.get_bind()
    for row in conn.execute(sa.text("SELECT id, ingredients, steps FROM recipes")).fetchall():
        ingredients = row.ingredients if isinstance(row.ingredients, list) else json.loads(row.ingredients)
        steps = row.steps if isinstance(row.steps, list) else json.loads(row.steps)
        details = []
        for step in steps:
            lowered = step.lower()
            details.append(
                {
                    "timer_seconds": _timer_seconds(step),
                    "ingredients": [i["name"] for i in ingredients if i["name"].lower() in lowered],
                }
            )
        conn.execute(
            sa.text("UPDATE recipes SET step_details = :d WHERE id = :id"),
            {"d": json.dumps(details), "id": row.id},
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("recipes", "step_details")
