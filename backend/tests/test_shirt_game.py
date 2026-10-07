"""The shirt game: how a day's shirt is picked, guess checking, and keeping answers back until you've finished."""
import datetime

from fastapi.testclient import TestClient

from backend.features.shirt_game import data
from backend.main import app

client = TestClient(app)
DAY = datetime.date(2026, 10, 7)
URL = f"/api/shirt-game/puzzles/{DAY}"


def test_the_same_shirt_is_picked_for_a_day_every_time() -> None:
    first, second = data.pick(DAY), data.pick(DAY)
    assert first == second


def test_the_answer_is_a_well_known_player_with_a_unique_number() -> None:
    for offset in range(60):
        choice = data.pick(DAY + datetime.timedelta(days=offset))
        players = next(
            e["players"] for e in data.load()[choice.season] if e["club"] == choice.club
        )
        wearing = [p for p in players if p[0] == choice.number]
        assert len(wearing) == 1
        assert wearing[0][1] == choice.player
        assert wearing[0][2] >= data.MIN_APPEARANCES
        assert choice.season in choice.season_options
        assert len(set(choice.season_options)) == data.SEASON_OPTIONS
        assert choice.player in choice.squad


def test_commons_urls_match_wikimedia_paths() -> None:
    assert data.commons_url("body").endswith("/b/bb/Kit_body.png")
    assert data.commons_url("body_leicester1516H").endswith("/6/62/Kit_body_leicester1516H.png")


def test_puzzle_has_the_shirt_but_not_the_answers() -> None:
    body = client.get(URL).json()
    assert set(body) == {"puzzle_date", "number", "kits", "teams", "season_options"}
    assert body["kits"][0]["type"] == "home"
    assert set(body["kits"][0]) == {"type", "colours", "base", "patterns"}
    assert body["kits"][0]["base"]["b"].startswith("https://upload.wikimedia.org/")
    assert "Arsenal" in body["teams"]
    assert client.get(URL).json() == body


def test_guesses_are_checked_and_answers_only_given_when_right() -> None:
    puzzle = data.pick(DAY)
    client.get(URL)  # builds it
    team = data.display_name(puzzle.club)

    wrong = client.post(f"{URL}/guess", json={"stage": "team", "value": "Not A Team"}).json()
    assert wrong == {"correct": False, "answer": None, "squad": None}

    right = client.post(f"{URL}/guess", json={"stage": "team", "value": f" {team.upper()} "}).json()
    assert right == {"correct": True, "answer": team, "squad": None}

    season = client.post(f"{URL}/guess", json={"stage": "season", "value": puzzle.season}).json()
    assert season["correct"] and season["squad"] == puzzle.squad

    player = client.post(f"{URL}/guess", json={"stage": "player", "value": puzzle.player}).json()
    assert player["answer"] == puzzle.player and player["squad"] is None


def test_the_answer_is_withheld_until_the_day_is_finished() -> None:
    day = datetime.date(2026, 10, 8)
    url = f"/api/shirt-game/puzzles/{day}"
    client.get(url)
    assert client.get(f"{url}/answer").status_code == 403

    posted = client.post(
        "/api/daily-games/shirt-game/results",
        json={"puzzle_date": str(day), "score": 1, "outcome": "lost", "details": {"lives_left": 0}},
    )
    assert posted.status_code == 201
    answer = client.get(f"{url}/answer").json()
    puzzle = data.pick(day)
    assert answer["player"] == puzzle.player and answer["season"] == puzzle.season


def test_far_future_days_are_refused() -> None:
    assert client.get("/api/shirt-game/puzzles/2099-01-01").status_code == 422


def test_results_must_hang_together() -> None:
    url = "/api/daily-games/shirt-game/results"
    day = str(datetime.date(2026, 10, 6))
    won_with_nothing_left = {"puzzle_date": day, "score": 3, "outcome": "won", "details": {"lives_left": 0}}
    assert client.post(url, json=won_with_nothing_left).status_code == 422
    won_but_scored_two = {"puzzle_date": day, "score": 2, "outcome": "won", "details": {"lives_left": 2}}
    assert client.post(url, json=won_but_scored_two).status_code == 422
    too_many_lives = {"puzzle_date": day, "score": 3, "outcome": "won", "details": {"lives_left": 4}}
    assert client.post(url, json=too_many_lives).status_code == 422
    assert client.post(url, json={**won_but_scored_two, "score": 3}).status_code == 201


def test_a_result_can_be_deleted_to_replay_a_day_only_when_running_locally(monkeypatch) -> None:
    url = "/api/daily-games/shirt-game/results"
    day = str(datetime.date(2026, 10, 5))
    body = {"puzzle_date": day, "score": 1, "outcome": "lost", "details": {"lives_left": 0, "stages": [True, False, False]}}
    assert client.post(url, json=body).status_code == 201

    monkeypatch.setattr("backend.features.daily_games.router.get_settings", lambda: type("S", (), {"environment": "production"})())
    assert client.delete(f"{url}/{day}").status_code == 404
    assert client.get(f"{url}/{day}").status_code == 200

    monkeypatch.undo()
    assert client.delete(f"{url}/{day}").status_code == 204
    assert client.get(f"{url}/{day}").status_code == 404
