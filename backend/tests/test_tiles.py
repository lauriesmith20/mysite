from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_public_tiles_need_no_auth_and_only_list_public_ones() -> None:
    created = client.post(
        "/api/tiles/",
        headers={"X-Local-User": "dummy-admin"},
        json={"title": "Guest Tile", "href": "/guest", "color": "#fff", "icon": None, "is_public": True},
    )
    assert created.status_code == 201

    response = client.get("/api/tiles/public")  # no auth header
    assert response.status_code == 200
    tiles = response.json()
    assert any(t["href"] == "/guest" for t in tiles)
    assert all(t["is_public"] for t in tiles)
