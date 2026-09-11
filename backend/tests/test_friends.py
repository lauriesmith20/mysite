from fastapi.testclient import TestClient

from backend.auth import require_approved_account
from backend.features.accounts.models import AccountStatus, AllowedAccount
from backend.main import app

client = TestClient(app)

_account_three = AllowedAccount(
    id=3, email="friend2@example.com", display_name="Friend Two", status=AccountStatus.APPROVED
)


def test_friend_request_flow() -> None:
    directory = client.get("/api/friends/directory")
    assert directory.status_code == 200
    assert any(entry["id"] == 3 for entry in directory.json())

    create_response = client.post("/api/friends/", json={"addressee_id": 3})
    assert create_response.status_code == 201
    friendship_id = create_response.json()["id"]

    duplicate_response = client.post("/api/friends/", json={"addressee_id": 3})
    assert duplicate_response.status_code == 409

    # Switch the auth override to the addressee, who is the only one allowed to accept.
    original_override = app.dependency_overrides[require_approved_account]
    app.dependency_overrides[require_approved_account] = lambda: _account_three
    try:
        accept_response = client.post(f"/api/friends/requests/{friendship_id}/accept")
    finally:
        app.dependency_overrides[require_approved_account] = original_override
    assert accept_response.status_code == 200
    assert accept_response.json()["id"] == 1

    friends_response = client.get("/api/friends/")
    assert friends_response.status_code == 200
    assert any(f["id"] == 3 for f in friends_response.json())


def test_decline_missing_request_returns_404() -> None:
    response = client.post("/api/friends/requests/999999/decline")
    assert response.status_code == 404
