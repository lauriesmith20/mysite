"""Rivalries over built-in daily games: challenge/accept, derived scores, tiebreaks and spoiler rules.

The test database is shared across the suite and each account can record one result per game per day,
so each scenario below uses its own accounts rather than reusing ones that have already played.
"""
import datetime
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

import pytest
from fastapi.testclient import TestClient
from httpx import Response

from backend.auth import require_approved_account
from backend.database import SessionLocal
from backend.features.accounts.models import AccountStatus, AllowedAccount
from backend.features.daily_games.models import DailyGameResult
from backend.features.daily_games.registry import GAMES, compare_results
from backend.main import app

client = TestClient(app)

KEY = "country-hopper"
RESULTS = f"/api/daily-games/{KEY}/results"

def _account(account_id: int, email: str, name: str) -> AllowedAccount:
    # avatar_color is set explicitly: its database default only applies on insert, and these
    # stand-ins are serialised (e.g. as the requester of a friend request) without being inserted.
    return AllowedAccount(
        id=account_id, email=email, display_name=name, status=AccountStatus.APPROVED, avatar_color="#66B2FF"
    )


ACCOUNTS = {
    2: _account(2, "friend@example.com", "Friend User"),
    3: _account(3, "friend2@example.com", "Friend Two"),
    4: _account(4, "rival4@example.com", "Rival Four"),
    5: _account(5, "rival5@example.com", "Rival Five"),
}


@pytest.fixture(scope="module", autouse=True)
def _extra_accounts() -> None:
    """Accounts 4 and 5 aren't in conftest; add them (persisted, so the API can look them up)."""
    with SessionLocal() as db:
        for account_id in (4, 5):
            if db.get(AllowedAccount, account_id) is None:
                source = ACCOUNTS[account_id]
                db.add(_account(account_id, source.email, source.display_name or ""))
        db.commit()


@contextmanager
def acting_as(account_id: int) -> Iterator[None]:
    """Run requests as a test account (account 1, the default, is the suite's own)."""
    original = app.dependency_overrides[require_approved_account]
    if account_id != 1:
        app.dependency_overrides[require_approved_account] = lambda: ACCOUNTS[account_id]
    try:
        yield
    finally:
        app.dependency_overrides[require_approved_account] = original


def call(account_id: int, method: str, url: str, **kwargs: Any) -> Response:
    with acting_as(account_id):
        return client.request(method, url, **kwargs)


def befriend(first: int, second: int) -> None:
    """Makes two accounts friends (a no-op if they already are)."""
    created = call(first, "post", "/api/friends/", json={"addressee_id": second})
    if created.status_code == 201:
        call(second, "post", f"/api/friends/requests/{created.json()['id']}/accept")


def challenge(challenger: int, opponent: int, key: str = KEY) -> dict:
    response = call(challenger, "post", "/api/game-scores/challenges", json={"opponent_id": opponent, "daily_game_key": key})
    assert response.status_code == 201, response.text
    return response.json()


def accept(account_id: int, game_id: int, local_date: str | None = None) -> dict:
    body = {"local_date": local_date} if local_date else None
    response = call(account_id, "post", f"/api/game-scores/{game_id}/accept", json=body)
    assert response.status_code == 200, response.text
    return response.json()


def play(account_id: int, day: datetime.date, score: int, lives: int, borders: int) -> None:
    response = call(
        account_id,
        "post",
        RESULTS,
        json={
            "puzzle_date": day.isoformat(),
            "score": score,
            "outcome": "won" if score > 0 else "lost",
            "details": {"lives_left": lives, "borders": borders, "shortest": 5},
        },
    )
    assert response.status_code in (200, 201), response.text


def days_for(account_id: int, game_id: int) -> list[dict]:
    response = call(account_id, "get", f"/api/game-scores/{game_id}/days")
    assert response.status_code == 200, response.text
    return response.json()


def rivals_for(account_id: int, day: datetime.date) -> list[dict]:
    response = call(account_id, "get", f"/api/daily-games/{KEY}/rivals/{day.isoformat()}")
    assert response.status_code == 200, response.text
    return response.json()


def _result(outcome: str, score: int, lives: int, borders: int) -> DailyGameResult:
    return DailyGameResult(
        account_id=1,
        game_key=KEY,
        puzzle_date=datetime.date(2026, 1, 1),
        score=score,
        outcome=outcome,
        details={"lives_left": lives, "borders": borders},
    )


def _today() -> datetime.date:
    return datetime.datetime.now(datetime.UTC).date()


# ── Ranking rules ────────────────────────────────────────────────────────────────────────────────


def test_tiebreak_order_is_suitcases_then_lives_then_fewer_hops() -> None:
    game = GAMES[KEY]
    assert compare_results(game, _result("won", 5, 1, 9), _result("won", 4, 3, 5)) == (1, "suitcases")
    assert compare_results(game, _result("won", 4, 3, 9), _result("won", 4, 2, 5)) == (1, "lives")
    assert compare_results(game, _result("won", 4, 2, 5), _result("won", 4, 2, 7)) == (1, "hops")
    assert compare_results(game, _result("won", 4, 2, 7), _result("won", 4, 2, 5)) == (-1, "hops")
    assert compare_results(game, _result("won", 4, 2, 5), _result("won", 4, 2, 5)) == (0, None)


def test_losses_tie_and_any_win_beats_a_loss() -> None:
    game = GAMES[KEY]
    # Giving up after fewer hops must not count as "fewer hops".
    assert compare_results(game, _result("lost", 0, 0, 1), _result("lost", 0, 0, 6)) == (0, None)
    assert compare_results(game, _result("won", 1, 1, 12), _result("lost", 0, 0, 1)) == (1, "suitcases")


# ── Challenge flow ───────────────────────────────────────────────────────────────────────────────


def test_challenge_validation() -> None:
    befriend(1, 2)
    assert call(1, "post", "/api/game-scores/challenges", json={"opponent_id": 1, "daily_game_key": KEY}).status_code == 400
    assert call(1, "post", "/api/game-scores/challenges", json={"opponent_id": 2, "daily_game_key": "nope"}).status_code == 404
    # Not friends with account 99 (or anyone unknown).
    assert call(1, "post", "/api/game-scores/challenges", json={"opponent_id": 99, "daily_game_key": KEY}).status_code == 403


def test_decline_removes_the_challenge_and_only_the_challenged_can_respond() -> None:
    befriend(1, 3)
    game = challenge(1, 3)
    assert game["challenge_status"] == "pending"
    assert game["daily_game_key"] == KEY
    assert game["name"] == "Country Hopper"
    assert (game["creator_score"], game["opponent_score"]) == (0, 0)

    # Only one live challenge or rivalry per pair and game.
    assert call(1, "post", "/api/game-scores/challenges", json={"opponent_id": 3, "daily_game_key": KEY}).status_code == 409

    # The challenger can't accept or decline their own challenge.
    assert call(1, "post", f"/api/game-scores/{game['id']}/accept").status_code == 403
    assert call(1, "post", f"/api/game-scores/{game['id']}/decline").status_code == 403

    incoming = call(3, "get", "/api/game-scores/challenges/incoming").json()
    mine = [c for c in incoming if c["id"] == game["id"]]
    assert len(mine) == 1
    assert mine[0]["challenger"]["id"] == 1
    assert mine[0]["title"] == "Country Hopper"

    assert call(3, "post", f"/api/game-scores/{game['id']}/decline").status_code == 204
    assert all(c["id"] != game["id"] for c in call(3, "get", "/api/game-scores/challenges/incoming").json())

    # A declined challenge is gone, so a new one can be sent.
    assert call(1, "get", f"/api/game-scores/{game['id']}").status_code == 404
    again = challenge(1, 3)
    assert call(1, "delete", f"/api/game-scores/{again['id']}").status_code == 204


def test_the_start_day_counts_even_if_played_before_accepting() -> None:
    befriend(4, 5)
    today = _today()
    yesterday = today - datetime.timedelta(days=1)
    # Yesterday is before the rivalry. Today was played before the challenge was even accepted.
    play(4, yesterday, score=1, lives=1, borders=9)
    play(5, yesterday, score=5, lives=3, borders=5)
    play(4, today, score=5, lives=3, borders=5)
    play(5, today, score=2, lives=1, borders=9)

    game = challenge(4, 5)
    accepted = accept(5, game["id"])
    assert accepted["challenge_status"] == "accepted"
    # Only today counts: no backfill before the start day, but nothing lost from the day itself.
    days = days_for(4, game["id"])
    assert [d["puzzle_date"] for d in days] == [today.isoformat()]
    assert (days[0]["winner"], days[0]["decided_by"]) == ("me", "suitcases")
    assert (accepted["creator_score"], accepted["opponent_score"]) == (1, 0)
    assert call(4, "delete", f"/api/game-scores/{game['id']}").status_code == 204


def test_accept_takes_the_players_local_date_and_validates_it() -> None:
    befriend(1, 3)
    game = challenge(1, 3)
    far_future = (_today() + datetime.timedelta(days=5)).isoformat()
    assert call(3, "post", f"/api/game-scores/{game['id']}/accept", json={"local_date": far_future}).status_code == 422
    # Still pending after the rejected attempt; a date a day ahead of UTC (a timezone east) is fine.
    tomorrow = (_today() + datetime.timedelta(days=1)).isoformat()
    assert accept(3, game["id"], local_date=tomorrow)["challenge_status"] == "accepted"
    assert call(1, "delete", f"/api/game-scores/{game['id']}").status_code == 204


# ── Scoring, spoilers and tiebreaks end to end ───────────────────────────────────────────────────


def test_full_rivalry_flow_with_spoiler_protection() -> None:
    befriend(2, 3)
    today = _today()
    tomorrow = today + datetime.timedelta(days=1)

    game = challenge(2, 3)  # account 2 is the "creator", 3 the "opponent"
    game_id = game["id"]
    accept(3, game_id)

    # Hand-scoring is off: the score comes from the daily results.
    assert call(2, "post", f"/api/game-scores/{game_id}/score", json={"player_id": 2}).status_code == 409

    # Account 3 plays today first. Account 2 can see *that* they played, but not how they did.
    play(3, today, score=4, lives=2, borders=6)
    first_look = days_for(2, game_id)
    assert len(first_look) == 1
    assert first_look[0]["mine"] is None
    assert first_look[0]["theirs"] is None
    assert first_look[0]["their_played"] is True
    assert first_look[0]["winner"] is None
    (rival,) = rivals_for(2, today)
    assert rival["friend"]["id"] == 3
    assert rival["friend_played"] is True
    assert rival["friend_result"] is None

    # Once account 2 has finished, the result is revealed, and the day is decided on suitcases.
    play(2, today, score=5, lives=3, borders=5)
    day = days_for(2, game_id)[0]
    assert day["mine"]["score"] == 5
    assert day["theirs"]["score"] == 4
    assert (day["winner"], day["decided_by"]) == ("me", "suitcases")
    (rival,) = rivals_for(2, today)
    assert rival["friend_result"]["score"] == 4
    # And from the other side the same day reads the other way round.
    other = days_for(3, game_id)[0]
    assert (other["winner"], other["decided_by"]) == ("them", "suitcases")

    # Tomorrow: level on suitcases, so lives decide it, in account 3's favour.
    play(2, tomorrow, score=4, lives=1, borders=7)
    play(3, tomorrow, score=4, lives=3, borders=7)
    days = days_for(2, game_id)
    assert [d["puzzle_date"] for d in days] == [tomorrow.isoformat(), today.isoformat()]
    assert (days[0]["winner"], days[0]["decided_by"]) == ("them", "lives")

    # One day each, so the rivalry is level 1-1.
    listed = call(2, "get", "/api/game-scores/with/3").json()
    rivalry = next(g for g in listed if g["id"] == game_id)
    assert (rivalry["creator_score"], rivalry["opponent_score"]) == (1, 1)
    assert rivalry["last_updated"] is not None


def test_days_endpoint_rejects_ordinary_games() -> None:
    befriend(1, 2)
    ordinary = call(1, "post", "/api/game-scores/", json={"opponent_id": 2, "name": "Chess"}).json()
    assert call(1, "get", f"/api/game-scores/{ordinary['id']}/days").status_code == 400
    assert ordinary["daily_game_key"] is None
    assert ordinary["challenge_status"] is None


# ── Wordle rivalries: fewer guesses wins, the same number is a draw ──────────────────────────────


def play_wordle(account_id: int, day: datetime.date, attempts: int | None) -> None:
    rows = attempts if attempts is not None else 6
    won = attempts is not None
    response = call(
        account_id,
        "post",
        "/api/daily-games/wordle/results",
        json={
            "puzzle_date": day.isoformat(),
            "score": 7 - attempts if attempts is not None else 0,
            "outcome": "won" if won else "lost",
            "details": {
                "puzzle_number": (day - datetime.date(2021, 6, 19)).days,
                "attempts": attempts,
                "hard_mode": False,
                "grid": ["\u2b1c" * 5] * (rows - 1) + ["\U0001f7e9" * 5 if won else "\u2b1c" * 5],
            },
        },
    )
    assert response.status_code in (200, 201), response.text


def test_wordle_rivalry_draws_on_equal_guesses_and_fewer_guesses_wins() -> None:
    befriend(2, 3)
    today = _today()
    tomorrow = today + datetime.timedelta(days=1)

    game = challenge(2, 3, key="wordle")
    assert game["name"] == "Wordle"
    accept(3, game["id"])

    # Same number of guesses: a draw, however it was reached.
    play_wordle(2, today, 3)
    play_wordle(3, today, 3)
    # Fewer guesses wins, and says what decided it.
    play_wordle(2, tomorrow, 3)
    play_wordle(3, tomorrow, 4)

    days = days_for(2, game["id"])
    assert [d["puzzle_date"] for d in days] == [tomorrow.isoformat(), today.isoformat()]
    assert (days[0]["winner"], days[0]["decided_by"]) == ("me", "guesses")
    assert (days[1]["winner"], days[1]["decided_by"]) == ("draw", None)

    listed = call(2, "get", "/api/game-scores/with/3").json()
    rivalry = next(g for g in listed if g["id"] == game["id"])
    assert (rivalry["creator_score"], rivalry["opponent_score"]) == (1, 0)
