"""Validates Microsoft Entra ID bearer tokens and enforces the DB-backed account allowlist.

Disabled (returns 501) until AZURE_AD_TENANT_ID / AZURE_AD_CLIENT_ID are configured,
so local development doesn't require an Entra app registration up front.
"""
from functools import lru_cache
from typing import Any

import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.database import get_db
from backend.features.accounts.models import AccountStatus, AllowedAccount

bearer_scheme = HTTPBearer(auto_error=False)

# Local-only dev accounts selectable via the `X-Local-User` header (see Settings.local_auth_bypass).
# Seed matching rows in allowed_accounts (see backend/README.md) for these to resolve to real accounts.
LOCAL_USERS: dict[str, dict[str, str]] = {
    "dummy": {"email": "dummy.user@example.com", "name": "Dummy User"},
    "dummy-admin": {"email": "dummy.admin@example.com", "name": "Dummy Admin"},
}


@lru_cache
def get_jwk_client(tenant_id: str) -> PyJWKClient:
    jwks_url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
    return PyJWKClient(jwks_url)


def get_current_claims(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    x_local_user: str | None = Header(default=None),
) -> dict[str, Any]:
    """FastAPI dependency that validates an Entra ID access token and returns its claims."""
    settings = get_settings()

    if settings.local_auth_bypass_enabled and x_local_user:
        local_user = LOCAL_USERS.get(x_local_user)
        if local_user is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown X-Local-User: {x_local_user}")
        return local_user

    if not settings.auth_enabled:
        raise HTTPException(
            status.HTTP_501_NOT_IMPLEMENTED,
            "Auth is not configured (set AZURE_AD_TENANT_ID / AZURE_AD_CLIENT_ID / AZURE_AD_API_AUDIENCE).",
        )
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")

    try:
        jwk_client = get_jwk_client(settings.azure_ad_tenant_id)  # type: ignore[arg-type]
        signing_key = jwk_client.get_signing_key_from_jwt(credentials.credentials)
        claims = jwt.decode(
            credentials.credentials,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.azure_ad_api_audience or settings.azure_ad_client_id,
            issuer=f"https://login.microsoftonline.com/{settings.azure_ad_tenant_id}/v2.0",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {exc}") from exc

    return claims


def extract_email(claims: dict[str, Any]) -> str:
    email = claims.get("email") or claims.get("preferred_username")
    if not email:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token has no email claim")
    return email.lower()


def get_or_create_account(
    claims: dict[str, Any] = Depends(get_current_claims),
    db: Session = Depends(get_db),
) -> AllowedAccount:
    """Looks up the caller's allowlist row, recording a pending one on first sign-in."""
    email = extract_email(claims)
    account = db.query(AllowedAccount).filter(AllowedAccount.email == email).first()
    if account is None:
        account = AllowedAccount(
            email=email, display_name=claims.get("name"), status=AccountStatus.PENDING
        )
        db.add(account)
        db.commit()
        db.refresh(account)
    return account


def require_approved_account(
    account: AllowedAccount = Depends(get_or_create_account),
) -> AllowedAccount:
    """FastAPI dependency that gates access to accounts approved in the allowlist."""
    if account.status != AccountStatus.APPROVED:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, f"Account not approved (status: {account.status.value})"
        )
    return account


def require_admin(account: AllowedAccount = Depends(require_approved_account)) -> AllowedAccount:
    """FastAPI dependency that additionally requires the account to be an admin."""
    if not account.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return account
