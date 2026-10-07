"""Which homepage tiles an account can see."""
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.features.accounts.models import AccountTileAccess, AllowedAccount
from backend.features.tiles.models import Tile


def visible_tiles(db: Session, account: AllowedAccount) -> list[Tile]:
    """Every tile for admins, otherwise the account's granted tiles plus every public tile."""
    if account.is_admin:
        return list(db.query(Tile).order_by(Tile.id).all())
    allowed_ids = [
        row.tile_id
        for row in db.query(AccountTileAccess).filter(AccountTileAccess.account_id == account.id)
    ]
    return list(
        db.query(Tile)
        .filter(or_(Tile.id.in_(allowed_ids), Tile.is_public.is_(True)))
        .order_by(Tile.id)
        .all()
    )
