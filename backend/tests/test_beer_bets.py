from fastapi.testclient import TestClient

from backend.auth import require_approved_account
from backend.features.accounts.models import AccountStatus, AllowedAccount
from backend.main import app

client = TestClient(app)

_account_two = AllowedAccount(
    id=2, email="friend@example.com", display_name="Friend User", status=AccountStatus.APPROVED
)


def _ensure_friends() -> None:
    create_response = client.post("/api/friends/", json={"addressee_id": 2})
    if create_response.status_code == 201:
        friendship_id = create_response.json()["id"]
        original_override = app.dependency_overrides[require_approved_account]
        app.dependency_overrides[require_approved_account] = lambda: _account_two
        try:
            client.post(f"/api/friends/requests/{friendship_id}/accept")
        finally:
            app.dependency_overrides[require_approved_account] = original_override


def _as_account_two(fn):
    original_override = app.dependency_overrides[require_approved_account]
    app.dependency_overrides[require_approved_account] = lambda: _account_two
    try:
        return fn()
    finally:
        app.dependency_overrides[require_approved_account] = original_override


def test_bet_lifecycle() -> None:
    _ensure_friends()

    create_response = client.post(
        "/api/beer-bets/",
        json={"opponent_id": 2, "title": "Marathon time", "description": "Under 4 hours", "stake": 2},
    )
    assert create_response.status_code == 201
    bet = create_response.json()
    assert bet["status"] == "awaiting_confirmation"

    list_response = client.get("/api/beer-bets/with/2")
    assert list_response.status_code == 200
    assert any(b["id"] == bet["id"] for b in list_response.json())

    # Only the opponent (account 2) can confirm.
    confirm_response = _as_account_two(lambda: client.post(f"/api/beer-bets/{bet['id']}/confirm"))
    assert confirm_response.status_code == 200
    assert confirm_response.json()["status"] == "open"

    claim_response = client.post(f"/api/beer-bets/{bet['id']}/resolve", json={"winner_id": 1})
    assert claim_response.status_code == 200
    assert claim_response.json()["status"] == "open"
    assert claim_response.json()["claimed_winner_id"] == 1

    # The claimant themselves cannot confirm or dispute their own claim.
    self_confirm_response = client.post(f"/api/beer-bets/{bet['id']}/confirm-winner")
    assert self_confirm_response.status_code == 400

    # The other participant can dispute, which resets the claim.
    dispute_response = _as_account_two(
        lambda: client.post(f"/api/beer-bets/{bet['id']}/dispute-winner")
    )
    assert dispute_response.status_code == 200
    assert dispute_response.json()["status"] == "open"
    assert dispute_response.json()["claimed_winner_id"] is None

    client.post(f"/api/beer-bets/{bet['id']}/resolve", json={"winner_id": 1})
    resolve_response = _as_account_two(
        lambda: client.post(f"/api/beer-bets/{bet['id']}/confirm-winner")
    )
    assert resolve_response.status_code == 200
    assert resolve_response.json()["status"] == "resolved"
    assert resolve_response.json()["winner_id"] == 1

    summary_response = client.get("/api/beer-bets/summary/2")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["net_beers"] == 2
    assert summary["owed_by"] == "them"


def test_get_bets_with_non_friend_returns_403() -> None:
    response = client.get("/api/beer-bets/with/999999")
    assert response.status_code == 403


def test_cancel_awaiting_bet_deletes_it() -> None:
    _ensure_friends()

    create_response = client.post(
        "/api/beer-bets/", json={"opponent_id": 2, "title": "Unconfirmed bet"}
    )
    bet_id = create_response.json()["id"]

    cancel_response = client.delete(f"/api/beer-bets/{bet_id}")
    assert cancel_response.status_code == 204

    list_response = client.get("/api/beer-bets/with/2")
    assert not any(b["id"] == bet_id for b in list_response.json())


def test_cancel_open_bet_marks_cancelled() -> None:
    _ensure_friends()

    create_response = client.post("/api/beer-bets/", json={"opponent_id": 2, "title": "Open bet"})
    bet_id = create_response.json()["id"]
    _as_account_two(lambda: client.post(f"/api/beer-bets/{bet_id}/confirm"))

    cancel_response = client.delete(f"/api/beer-bets/{bet_id}")
    assert cancel_response.status_code == 204

    list_response = client.get("/api/beer-bets/with/2")
    cancelled = next(b for b in list_response.json() if b["id"] == bet_id)
    assert cancelled["status"] == "cancelled"


def test_cash_out_settles_balance() -> None:
    _ensure_friends()

    cash_out_response = client.post("/api/beer-bets/cash-out/2", json={"beers": 3})
    assert cash_out_response.status_code == 201
    bet = cash_out_response.json()
    assert bet["status"] == "resolved"
    assert bet["is_settlement"] is True
    assert bet["winner_id"] == 2

    summary_response = client.get("/api/beer-bets/summary/2")
    assert summary_response.json()["owed_by"] == "me"
