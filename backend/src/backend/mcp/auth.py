"""Verifies Entra ID bearer tokens for the MCP server (reuses backend.auth's validation)."""
import jwt
from mcp.server.auth.provider import AccessToken, TokenVerifier

from backend.auth import LOCAL_USERS, extract_email, get_jwk_client
from backend.config import get_settings
from backend.database import SessionLocal
from backend.features.accounts.models import AccountStatus, AllowedAccount

_settings = get_settings()

# No trailing slash: must exactly match the MCP server URL as entered in Claude's connector
# settings (Claude's `resource` param is compared byte-for-byte against this).
RESOURCE_URL = f"{_settings.public_base_url or 'http://127.0.0.1:8000'}/mcp"

# Entra's v2 endpoint requires scopes to be fully qualified with an Application ID URI (a bare
# "access_as_user" is rejected with invalid_scope) — RESOURCE_URL is registered as one, see
# deploy.sh's identifierUris setup.
SCOPE_NAME = f"{RESOURCE_URL}/access_as_user"


class EntraTokenVerifier(TokenVerifier):
    """Validates the same Entra ID tokens `backend.auth` accepts, then checks the DB allowlist."""

    async def verify_token(self, token: str) -> AccessToken | None:
        settings = get_settings()

        # Local dev convenience: allow the same `X-Local-User`-style dummy tokens used elsewhere,
        # sent directly as the bearer token (e.g. `Authorization: Bearer dummy`) since MCP has no
        # header to spare for X-Local-User.
        if settings.local_auth_bypass_enabled and token in LOCAL_USERS:
            claims = LOCAL_USERS[token]
        elif not settings.auth_enabled:
            return None
        else:
            try:
                jwk_client = get_jwk_client(settings.azure_ad_tenant_id)  # type: ignore[arg-type]
                signing_key = jwk_client.get_signing_key_from_jwt(token)
                claims = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["RS256"],
                    audience=settings.azure_ad_api_audience or settings.azure_ad_client_id,
                    issuer=f"https://login.microsoftonline.com/{settings.azure_ad_tenant_id}/v2.0",
                )
            except jwt.PyJWTError:
                return None

        email = extract_email(claims)
        with SessionLocal() as db:
            account = db.query(AllowedAccount).filter(AllowedAccount.email == email).first()
            if account is None or account.status != AccountStatus.APPROVED:
                return None
            return AccessToken(token=token, client_id=email, scopes=[SCOPE_NAME])
