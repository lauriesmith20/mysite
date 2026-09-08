"""Validates Microsoft Entra ID (Azure AD) bearer tokens.

Disabled (returns 501) until AZURE_AD_TENANT_ID / AZURE_AD_CLIENT_ID are configured,
so local development doesn't require an Entra app registration up front.
"""
from functools import lru_cache
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from backend.config import get_settings

bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache
def _get_jwk_client(tenant_id: str) -> PyJWKClient:
    jwks_url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
    return PyJWKClient(jwks_url)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    """FastAPI dependency that validates an Entra ID access token and returns its claims."""
    settings = get_settings()
    if not settings.auth_enabled:
        raise HTTPException(
            status.HTTP_501_NOT_IMPLEMENTED,
            "Auth is not configured (set AZURE_AD_TENANT_ID / AZURE_AD_CLIENT_ID / AZURE_AD_API_AUDIENCE).",
        )
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")

    try:
        jwk_client = _get_jwk_client(settings.azure_ad_tenant_id)  # type: ignore[arg-type]
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
