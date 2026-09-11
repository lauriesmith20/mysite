"""Routes for managing the Microsoft account allowlist."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.auth import get_or_create_account, require_admin
from backend.database import get_db
from backend.features.accounts.models import AccountTileAccess, AllowedAccount
from backend.features.accounts.schemas import (
    AccountRead,
    AccountUpdate,
    MeRead,
    MeUpdate,
    TileAccessUpdate,
)
from backend.features.tiles.models import Tile

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.get("/me", response_model=MeRead)
def get_me(account: AllowedAccount = Depends(get_or_create_account)) -> AllowedAccount:
    """Returns the caller's own allowlist status, creating a pending row on first sign-in."""
    return account


@router.patch("/me", response_model=MeRead)
def update_me(
    payload: MeUpdate,
    account: AllowedAccount = Depends(get_or_create_account),
    db: Session = Depends(get_db),
) -> AllowedAccount:
    """Lets the caller set their own nickname/avatar colour."""
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(account, field, value)
    db.commit()
    db.refresh(account)
    return account


@router.get("/", response_model=list[AccountRead], dependencies=[Depends(require_admin)])
def list_accounts(db: Session = Depends(get_db)) -> list[AllowedAccount]:
    return list(db.query(AllowedAccount).order_by(AllowedAccount.created_at).all())


@router.patch("/{account_id}", response_model=AccountRead, dependencies=[Depends(require_admin)])
def update_account(
    account_id: int, payload: AccountUpdate, db: Session = Depends(get_db)
) -> AllowedAccount:
    account = db.get(AllowedAccount, account_id)
    if account is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    if payload.status is not None:
        account.status = payload.status
    if payload.is_admin is not None:
        account.is_admin = payload.is_admin
    db.commit()
    db.refresh(account)
    return account


@router.get(
    "/tile-access",
    response_model=dict[int, list[int]],
    dependencies=[Depends(require_admin)],
)
def get_all_tile_access(db: Session = Depends(get_db)) -> dict[int, list[int]]:
    """Returns every account's granted tile IDs in one call, keyed by account ID."""
    result: dict[int, list[int]] = {}
    for row in db.query(AccountTileAccess).all():
        result.setdefault(row.account_id, []).append(row.tile_id)
    return result


@router.get(
    "/{account_id}/tile-access",
    response_model=list[int],
    dependencies=[Depends(require_admin)],
)
def get_tile_access(account_id: int, db: Session = Depends(get_db)) -> list[int]:
    account = db.get(AllowedAccount, account_id)
    if account is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    rows = db.query(AccountTileAccess).filter(AccountTileAccess.account_id == account_id).all()
    return [row.tile_id for row in rows]


@router.put(
    "/{account_id}/tile-access",
    response_model=list[int],
    dependencies=[Depends(require_admin)],
)
def update_tile_access(
    account_id: int, payload: TileAccessUpdate, db: Session = Depends(get_db)
) -> list[int]:
    account = db.get(AllowedAccount, account_id)
    if account is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")

    valid_tile_ids = {tid for (tid,) in db.query(Tile.id).filter(Tile.id.in_(payload.tile_ids))}
    if valid_tile_ids != set(payload.tile_ids):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "One or more tile IDs do not exist")

    db.query(AccountTileAccess).filter(AccountTileAccess.account_id == account_id).delete()
    for tile_id in valid_tile_ids:
        db.add(AccountTileAccess(account_id=account_id, tile_id=tile_id))
    db.commit()
    return sorted(valid_tile_ids)
