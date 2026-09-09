"""Routes for managing the Microsoft account allowlist."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.auth import get_or_create_account, require_admin
from backend.database import get_db
from backend.features.accounts.models import AllowedAccount
from backend.features.accounts.schemas import AccountRead, AccountUpdate, MeRead

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.get("/me", response_model=MeRead)
def get_me(account: AllowedAccount = Depends(get_or_create_account)) -> AllowedAccount:
    """Returns the caller's own allowlist status, creating a pending row on first sign-in."""
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
