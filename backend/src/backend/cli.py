"""Console script entrypoint for local development (`uv run api`)."""
import uvicorn

from backend.config import get_settings


def main() -> None:
    settings = get_settings()
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=settings.environment == "local")
