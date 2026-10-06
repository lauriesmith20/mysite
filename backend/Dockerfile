# Azure Container Apps consumption (free tier) friendly image.
# Two stages: the build tools (uv, its cache) stay in the first, and only the finished app and its
# virtualenv are copied into the final image. A smaller image means a faster cold start, since the
# image is pulled and unpacked every time the app scales up from zero.
FROM python:3.12-slim AS build

ENV PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY src ./src
COPY README.md ./
RUN uv sync --frozen --no-dev


FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# The virtualenv has the project installed in place (editable), so it must stay at the same path.
COPY --from=build /app/.venv ./.venv
COPY --from=build /app/src ./src
COPY alembic.ini ./
COPY migrations ./migrations

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

# Migrations run as a deploy.sh step (docker run --entrypoint alembic), not on every
# container start — avoids adding a DB round-trip to every scale-to-zero cold start.
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
