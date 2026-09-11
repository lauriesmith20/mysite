"""Shared MCP (Model Context Protocol) server. Feature packages register tools onto `mcp_server`
via their own `mcp_tools.py` (mirroring how they register HTTP routes via `router.py`).
"""
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from urllib.parse import urlparse

from fastapi import FastAPI
from mcp.server import MCPServer
from mcp.server.auth.settings import AuthSettings
from mcp.server.transport_security import TransportSecuritySettings
from pydantic import AnyHttpUrl

from backend.config import get_settings
from backend.mcp.auth import RESOURCE_URL, SCOPE_NAME, EntraTokenVerifier

settings = get_settings()

mcp_server = MCPServer(
    "Personal Website",
    token_verifier=EntraTokenVerifier(),
    auth=AuthSettings(
        issuer_url=AnyHttpUrl(
            f"https://login.microsoftonline.com/{settings.azure_ad_tenant_id}/v2.0"
            if settings.azure_ad_tenant_id
            # Placeholder so the server can still start with auth unconfigured, e.g. local dev.
            else "https://login.microsoftonline.com/consumers/v2.0"
        ),
        resource_server_url=AnyHttpUrl(RESOURCE_URL),
        required_scopes=[SCOPE_NAME],
        # Entra's `aud` claim is the API's client ID, not this resource URL — verified separately
        # in EntraTokenVerifier, so skip the SDK's own resource-match check.
        validate_token_resource=False,
    ),
)


def _allowed_hosts() -> list[str] | None:
    if not settings.public_base_url:
        return None
    host = urlparse(settings.public_base_url).netloc
    return [host, f"{host}:*"]


def mount(app: FastAPI) -> None:
    """Mounts the MCP server at /mcp on the given FastAPI app and wires its session lifespan.

    Must be called after all other routers are registered: the returned sub-app already serves
    its own routes at /mcp and /.well-known/oauth-protected-resource/mcp (per RFC 9728), so it's
    mounted at the app root and relies on Starlette trying more specific routes first.
    """
    # Only override the SDK's default (localhost-only) DNS-rebinding allowlist once deployed —
    # passing an explicit TransportSecuritySettings locally would otherwise loosen it for nothing.
    transport_security = (
        TransportSecuritySettings(allowed_hosts=_allowed_hosts())
        if settings.public_base_url
        else None
    )
    mcp_app = mcp_server.streamable_http_app(transport_security=transport_security)
    app.mount("/", mcp_app)

    original_lifespan = app.router.lifespan_context

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        async with mcp_server.session_manager.run(), original_lifespan(app):
            yield

    app.router.lifespan_context = lifespan
