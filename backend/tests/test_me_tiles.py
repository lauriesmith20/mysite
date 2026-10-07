"""/me carries the links of the homepage tiles an account can see (the tiles themselves live in the frontend)."""
from fastapi.testclient import TestClient

from backend.database import SessionLocal
from backend.features.accounts.models import (
    AccountStatus,
    AccountTileAccess,
    AllowedAccount,
)
from backend.features.tiles.access import visible_tiles
from backend.features.tiles.models import Tile
from backend.main import app

client = TestClient(app)


def test_admin_me_lists_every_tile_link() -> None:
    admin = {"X-Local-User": "dummy-admin"}
    client.post(
        "/api/tiles/",
        headers=admin,
        json={"title": "Admin Seen", "href": "/admin-seen", "color": "#fff", "icon": None, "is_public": False},
    )
    client.get("/api/accounts/me", headers=admin)  # creates the account on first sign-in, as a pending non-admin
    with SessionLocal() as db:
        account = db.query(AllowedAccount).filter(AllowedAccount.email == "dummy.admin@example.com").one()
        account.is_admin = True
        account.status = AccountStatus.APPROVED
        db.commit()
    me = client.get("/api/accounts/me", headers=admin).json()
    assert me["is_admin"] and "/admin-seen" in me["tile_hrefs"]


def test_others_see_public_tiles_and_only_the_ones_granted() -> None:
    with SessionLocal() as db:
        public = Tile(title="Open", href="/open", color="#fff", icon=None, is_public=True)
        granted = Tile(title="Granted", href="/granted", color="#fff", icon=None, is_public=False)
        hidden = Tile(title="Hidden", href="/hidden", color="#fff", icon=None, is_public=False)
        db.add_all([public, granted, hidden])
        db.commit()
        account = db.get(AllowedAccount, 3)
        assert account is not None
        db.add(AccountTileAccess(account_id=account.id, tile_id=granted.id))
        db.commit()
        hrefs = [tile.href for tile in visible_tiles(db, account)]
    assert {"/open", "/granted"} <= set(hrefs)
    assert "/hidden" not in hrefs
