import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event

from backend.database import engine
from backend.main import app

client = TestClient(app)


def _ensure_friends() -> None:
    create_response = client.post("/api/friends/", json={"addressee_id": 2})
    if create_response.status_code == 201:
        friendship_id = create_response.json()["id"]
        from backend.auth import require_approved_account
        from backend.features.accounts.models import AccountStatus, AllowedAccount

        account_two = AllowedAccount(
            id=2, email="friend@example.com", display_name="Friend User", status=AccountStatus.APPROVED
        )
        original_override = app.dependency_overrides[require_approved_account]
        app.dependency_overrides[require_approved_account] = lambda: account_two
        try:
            client.post(f"/api/friends/requests/{friendship_id}/accept")
        finally:
            app.dependency_overrides[require_approved_account] = original_override


def test_create_list_and_score_game() -> None:
    _ensure_friends()

    create_response = client.post(
        "/api/game-scores/", json={"opponent_id": 2, "name": "Chess", "image_url": None}
    )
    assert create_response.status_code == 201
    game = create_response.json()
    assert game["creator_score"] == 0
    assert game["opponent_score"] == 0
    assert game["creator"]["id"] == 1
    assert game["opponent"]["id"] == 2

    list_response = client.get("/api/game-scores/with/2")
    assert list_response.status_code == 200
    assert any(g["id"] == game["id"] for g in list_response.json())

    score_response = client.post(f"/api/game-scores/{game['id']}/score", json={"player_id": 2})
    assert score_response.status_code == 200
    assert score_response.json()["opponent_score"] == 1


def test_get_missing_game_returns_404() -> None:
    response = client.get("/api/game-scores/999999")
    assert response.status_code == 404



@pytest.fixture
def enforce_foreign_keys():
    """Turn on SQLite foreign key enforcement, as Turso has it, which plain SQLite leaves off."""

    def _on(dbapi_connection, _record) -> None:
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    event.listen(engine, "connect", _on)
    engine.dispose()  # so new connections pick the pragma up
    yield
    event.remove(engine, "connect", _on)
    engine.dispose()


def test_delete_game_that_has_score_history(enforce_foreign_keys) -> None:
    _ensure_friends()
    game = client.post("/api/game-scores/", json={"opponent_id": 2, "name": "Darts"}).json()
    assert client.post(f"/api/game-scores/{game['id']}/score", json={"player_id": 1}).status_code == 200
    assert client.get(f"/api/game-scores/{game['id']}/history").json() != []

    # Used to fail with a foreign key error (a 500) because the score history still pointed at the game.
    assert client.delete(f"/api/game-scores/{game['id']}").status_code == 204
    assert client.get(f"/api/game-scores/{game['id']}").status_code == 404
