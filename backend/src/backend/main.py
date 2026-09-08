"""FastAPI application entrypoint."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import get_settings
from backend.database import Base, engine
from backend.routers import health

settings = get_settings()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Personal Website API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
# Feature routers get included here as they're added, e.g.:
# from backend.features.game_scores.router import router as game_scores_router
# app.include_router(game_scores_router, prefix="/api/game-scores")
