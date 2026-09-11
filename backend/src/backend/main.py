"""FastAPI application entrypoint."""
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from backend.auth import require_approved_account
from backend.config import get_settings
from backend.features.accounts.router import router as accounts_router
from backend.features.beer_bets.router import router as beer_bets_router
from backend.features.friends.router import router as friends_router
from backend.features.game_scores.router import router as game_scores_router
from backend.features.plant_quiz.router import router as plant_quiz_router

# Registers recipes' tools onto the shared mcp.mcp_server as an import side effect.
from backend.features.recipes import mcp_tools as _recipes_mcp_tools  # noqa: F401
from backend.features.recipes.router import router as recipes_router
from backend.features.tiles.router import router as tiles_router
from backend.logging_config import configure_logging, get_logger
from backend.mcp import server as mcp
from backend.routers import health

settings = get_settings()
configure_logging()
logger = get_logger(__name__)

# Schema (including default tile rows) is managed by Alembic migrations (see migrations/), run
# via `uv run alembic upgrade head` — kept out of import-time code so it only runs once per
# deploy instead of on every cold start.


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    logger.info("Backend started (environment=%s, auth_enabled=%s)", settings.environment, settings.auth_enabled)
    yield


app = FastAPI(title="Personal Website API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.monotonic()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.monotonic() - start) * 1000
        logger.exception("%s %s failed after %.1fms", request.method, request.url.path, duration_ms)
        raise
    duration_ms = (time.monotonic() - start) * 1000
    logger.info(
        "%s %s %d %.1fms", request.method, request.url.path, response.status_code, duration_ms
    )
    return response

app.include_router(health.router)
# /me is intentionally public to any valid token holder so unapproved sign-ins get recorded.
app.include_router(accounts_router)
app.include_router(game_scores_router, dependencies=[Depends(require_approved_account)])
app.include_router(tiles_router, dependencies=[Depends(require_approved_account)])
app.include_router(plant_quiz_router, dependencies=[Depends(require_approved_account)])
app.include_router(recipes_router, dependencies=[Depends(require_approved_account)])
app.include_router(friends_router, dependencies=[Depends(require_approved_account)])
app.include_router(beer_bets_router, dependencies=[Depends(require_approved_account)])

# Mounted last: it's a root-level ("/") mount, so more specific routes above must be tried first.
mcp.mount(app)
