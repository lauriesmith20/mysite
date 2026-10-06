"""One-off: turn a hand-scored "Wordle" H2H game into a linked Wordle rivalry, keeping its tally.

The hand-scored game's points are kept as the starting tally (rivalry scores = carried-over points +
days won). If a Wordle challenge already exists between the same two players (made while trying the
new feature), its row is removed; its daily results live in daily_game_results and are unaffected.
Today's day is already inside the carried-over tally (it was scored by hand), so the point it awards
under the new rules is taken back off the tally, so it isn't counted twice.

Run from backend/ (reads TURSO_* from .env). Dry run unless --apply is given:
    uv run python scripts/convert_wordle_game.py [--apply]
"""

import datetime
import sys

from dotenv import dotenv_values
from sqlalchemy import create_engine, text

APPLY = "--apply" in sys.argv
env = dotenv_values(".env")
engine = create_engine(
    env["TURSO_DATABASE_URL"], connect_args={"auth_token": env["TURSO_AUTH_TOKEN"]}
)

with engine.begin() as db:
    games = db.execute(
        text(
            "SELECT id, creator_id, opponent_id, creator_score, opponent_score, daily_game_key, started_on "
            "FROM h2h_games WHERE lower(name) = 'wordle' ORDER BY id"
        )
    ).fetchall()
    print("Wordle games:", [tuple(g) for g in games])
    manual = [g for g in games if g.daily_game_key is None]
    linked = [g for g in games if g.daily_game_key == "wordle"]
    if len(manual) != 1:
        sys.exit(f"Expected exactly one hand-scored Wordle game, found {len(manual)}")
    old = manual[0]
    pair = {old.creator_id, old.opponent_id}
    twins = [g for g in linked if {g.creator_id, g.opponent_id} == pair]
    start = (
        max((g.started_on for g in twins if g.started_on), default=None)
        or datetime.datetime.now(datetime.UTC).date()
    )

    def result(account_id: int, day: datetime.date) -> int | None:
        row = db.execute(
            text(
                "SELECT score FROM daily_game_results WHERE game_key='wordle' AND account_id=:a AND puzzle_date=:d"
            ),
            {"a": account_id, "d": day.isoformat()},
        ).fetchone()
        return None if row is None else row[0]

    creator, opponent = old.creator_score, old.opponent_score
    mine, theirs = result(old.creator_id, start), result(old.opponent_id, start)
    print(
        f"Tally {creator}-{opponent}; start day {start}: creator={mine} opponent={theirs}"
    )
    if mine is not None and theirs is not None and mine != theirs:
        if mine > theirs:
            creator -= 1
        else:
            opponent -= 1
    print(
        f"Carried-over tally after removing today's double entry: {creator}-{opponent}"
    )

    if not APPLY:
        sys.exit("Dry run: nothing changed. Re-run with --apply.")
    for twin in twins:
        db.execute(
            text("DELETE FROM h2h_game_score_history WHERE game_id = :g"),
            {"g": twin.id},
        )
        db.execute(text("DELETE FROM h2h_games WHERE id = :g"), {"g": twin.id})
    db.execute(
        text(
            "UPDATE h2h_games SET daily_game_key='wordle', challenge_status='accepted', accepted_at=:now, "
            "started_on=:start, creator_score=:c, opponent_score=:o WHERE id=:id"
        ),
        {
            "now": datetime.datetime.now(datetime.UTC).isoformat(sep=" "),
            "start": start.isoformat(),
            "c": creator,
            "o": opponent,
            "id": old.id,
        },
    )
    print("Converted game", old.id)
