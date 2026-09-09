"""Routes for homepage navigation tiles."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.features.tiles.models import Tile
from backend.features.tiles.schemas import TileCreate, TileRead

router = APIRouter(prefix="/api/tiles", tags=["tiles"])


@router.get("/", response_model=list[TileRead])
def list_tiles(db: Session = Depends(get_db)) -> list[Tile]:
    return list(db.query(Tile).order_by(Tile.id).all())


@router.post("/", response_model=TileRead, status_code=status.HTTP_201_CREATED)
def create_tile(payload: TileCreate, db: Session = Depends(get_db)) -> Tile:
    tile = Tile(title=payload.title, href=payload.href, color=payload.color, icon=payload.icon)
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
