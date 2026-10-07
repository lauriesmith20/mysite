"""Routes for homepage navigation tiles."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.auth import require_approved_account
from backend.database import get_db
from backend.features.accounts.models import AllowedAccount
from backend.features.tiles.access import visible_tiles
from backend.features.tiles.models import Tile
from backend.features.tiles.schemas import TileCreate, TileRead

router = APIRouter(prefix="/api/tiles", tags=["tiles"])
# Unauthenticated: registered separately in main.py so it isn't behind require_approved_account.
public_router = APIRouter(prefix="/api/tiles", tags=["tiles"])


@public_router.get("/public", response_model=list[TileRead])
def list_public_tiles(db: Session = Depends(get_db)) -> list[Tile]:
    """Tiles anyone can see, signed in or not (the guest home page)."""
    return list(db.query(Tile).filter(Tile.is_public.is_(True)).order_by(Tile.id).all())


@router.get("/", response_model=list[TileRead])
def list_tiles(
    db: Session = Depends(get_db),
    account: AllowedAccount = Depends(require_approved_account),
) -> list[Tile]:
    """Returns all tiles for admins, or the caller's granted tiles plus every public tile."""
    return visible_tiles(db, account)


@router.post("/", response_model=TileRead, status_code=status.HTTP_201_CREATED)
def create_tile(payload: TileCreate, db: Session = Depends(get_db)) -> Tile:
    tile = Tile(
        title=payload.title,
        href=payload.href,
        color=payload.color,
        icon=payload.icon,
        is_public=payload.is_public,
    )
    db.add(tile)
    db.commit()
    db.refresh(tile)
    return tile


@router.delete("/{tile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tile(tile_id: int, db: Session = Depends(get_db)) -> None:
    tile = db.get(Tile, tile_id)
    if tile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tile not found")
    db.delete(tile)
    db.commit()
