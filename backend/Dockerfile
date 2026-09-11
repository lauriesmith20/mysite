# Azure Container Apps consumption (free tier) friendly image.
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY src ./src
COPY alembic.ini ./
COPY migrations ./migrations
COPY README.md ./
RUN uv sync --frozen --no-dev

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

# Migrations run as a deploy.sh step (docker run --entrypoint alembic), not on every
# container start — avoids adding a DB round-trip to every scale-to-zero cold start.
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
