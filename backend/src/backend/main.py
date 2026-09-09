"""FastAPI application entrypoint."""
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.auth import require_approved_account
from backend.config import get_settings
from backend.database import SessionLocal
from backend.features.accounts.router import router as accounts_router
from backend.features.game_scores.router import router as game_scores_router
from backend.features.plant_quiz.router import router as plant_quiz_router
from backend.features.tiles.models import Tile
from backend.features.tiles.router import router as tiles_router
from backend.routers import health

settings = get_settings()

# Schema is managed by Alembic migrations (see migrations/), run via `uv run alembic upgrade head`.

with SessionLocal() as db:
    if db.query(Tile).count() == 0:
        db.add(
            Tile(
                title="H2H: Maeve vs Laurie",
                href="/game-scores",
                color="#ed3e5b",
                icon="swords",
            )
        )
        db.commit()

app = FastAPI(title="Personal Website API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
# /me is intentionally public to any valid token holder so unapproved sign-ins get recorded.
app.include_router(accounts_router)
app.include_router(game_scores_router, dependencies=[Depends(require_approved_account)])
app.include_router(tiles_router, dependencies=[Depends(require_approved_account)])
app.include_router(plant_quiz_router, dependencies=[Depends(require_approved_account)])
