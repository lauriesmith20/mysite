from fastapi.testclient import TestClient

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

