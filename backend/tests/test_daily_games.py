import datetime

from fastapi.testclient import TestClient

from backend.auth import require_approved_account
from backend.features.accounts.models import AccountStatus, AllowedAccount
from backend.main import app

client = TestClient(app)

URL = "/api/daily-games/country-hopper/results"


def _result(day: str, score: int = 4, outcome: str = "won", **details: object) -> dict[str, object]:
    return {"puzzle_date": day, "score": score, "outcome": outcome, "details": details or {"path": ["India"]}}


def test_first_result_is_final_and_reposting_returns_it() -> None:
    first = client.post(URL, json=_result("2026-01-10", score=4, lives_left=2))
    assert first.status_code == 201
    stored = first.json()
    assert stored["game_key"] == "country-hopper"
    assert stored["score"] == 4
    assert stored["details"] == {"lives_left": 2}

    # A retry (or a replay attempt for a better score) gets the original back, unchanged.
    again = client.post(URL, json=_result("2026-01-10", score=5, outcome="won", lives_left=3))
    assert again.status_code == 200
    assert again.json()["id"] == stored["id"]
    assert again.json()["score"] == 4


def test_lost_games_score_zero_and_are_recorded() -> None:
    response = client.post(URL, json=_result("2026-01-11", score=0, outcome="lost"))
    assert response.status_code == 201
    assert response.json()["outcome"] == "lost"


def test_rejects_invalid_results() -> None:
    assert client.post(URL, json=_result("2026-01-12", score=6)).status_code == 422  # above max score
    assert client.post(URL, json=_result("2026-01-12", score=-1)).status_code == 422
    assert client.post(URL, json=_result("2026-01-12", outcome="drew")).status_code == 422

    future = (datetime.datetime.now(datetime.UTC).date() + datetime.timedelta(days=3)).isoformat()
    assert client.post(URL, json=_result(future)).status_code == 422

    tomorrow = (datetime.datetime.now(datetime.UTC).date() + datetime.timedelta(days=1)).isoformat()
    assert client.post(URL, json=_result(tomorrow)).status_code == 201  # a timezone ahead of UTC is fine

    huge = {"puzzle_date": "2026-01-13", "score": 3, "outcome": "won", "details": {"blob": "x" * 5000}}
    assert client.post(URL, json=huge).status_code == 422


def test_unknown_game_is_404() -> None:
    assert client.post("/api/daily-games/not-a-game/results", json=_result("2026-01-14")).status_code == 404
    assert client.get("/api/daily-games/not-a-game/results").status_code == 404


def test_list_is_newest_first_and_get_by_date() -> None:
    for day, score in [("2026-02-01", 5), ("2026-02-03", 2), ("2026-02-02", 3)]:
        assert client.post(URL, json=_result(day, score=score)).status_code in (200, 201)

    listed = client.get(URL).json()
    dates = [r["puzzle_date"] for r in listed]
    assert dates == sorted(dates, reverse=True)
    assert {"2026-02-01", "2026-02-02", "2026-02-03"} <= set(dates)

    found = client.get(f"{URL}/2026-02-02")
    assert found.status_code == 200
    assert found.json()["score"] == 3
    assert client.get(f"{URL}/2025-12-31").status_code == 404

    limited = client.get(URL, params={"limit": 1}).json()
    assert len(limited) == 1


def test_results_are_private_to_each_account() -> None:
    assert client.post(URL, json=_result("2026-03-01", score=5)).status_code in (200, 201)

    other = AllowedAccount(
        id=2, email="friend@example.com", display_name="Friend User", status=AccountStatus.APPROVED
    )
    original = app.dependency_overrides[require_approved_account]
    app.dependency_overrides[require_approved_account] = lambda: other
    try:
        # The friend sees none of the first account's results and can record their own for the same day.
        assert all(r["puzzle_date"] != "2026-03-01" for r in client.get(URL).json())
        assert client.get(f"{URL}/2026-03-01").status_code == 404
        mine = client.post(URL, json=_result("2026-03-01", score=1))
        assert mine.status_code == 201
        assert mine.json()["score"] == 1
    finally:
        app.dependency_overrides[require_approved_account] = original

    assert client.get(f"{URL}/2026-03-01").json()["score"] == 5
