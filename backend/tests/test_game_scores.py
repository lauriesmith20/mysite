from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_create_list_and_score_game() -> None:
    create_response = client.post("/api/game-scores/", json={"name": "Chess", "image_url": None})
    assert create_response.status_code == 201
    game = create_response.json()
    assert game["laurie_score"] == 0
    assert game["maeve_score"] == 0

    list_response = client.get("/api/game-scores/")
    assert list_response.status_code == 200
    assert any(g["id"] == game["id"] for g in list_response.json())

    score_response = client.post(f"/api/game-scores/{game['id']}/score", json={"player": "maeve"})
    assert score_response.status_code == 200
    assert score_response.json()["maeve_score"] == 1


def test_get_missing_game_returns_404() -> None:
    response = client.get("/api/game-scores/999999")
    assert response.status_code == 404
