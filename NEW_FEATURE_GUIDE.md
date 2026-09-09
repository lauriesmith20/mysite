# New feature guide

Checklist for adding a new tile/feature to the site. Each tile is a self-contained mini-app —
functionality can vary wildly (a game, a quiz, a tracker, a static page, something with no backend
at all). Don't force every feature into the same shape; use only the pieces below that the feature
actually needs.

## 1. Decide the shape

- Needs persisted data? → backend subpackage + migration.
- Just a page with no state? → frontend-only, skip straight to step 4.
- Gated to specific people, or open to every approved account? → affects whether it needs a
  `account_tile_access` grant (see `backend/src/backend/features/accounts/models.py`).

## 2. Backend (skip if no persisted data)

Add a subpackage under `backend/src/backend/features/<name>/`:

```
features/<name>/
  __init__.py
  models.py    # SQLAlchemy models (backend.database.Base)
  schemas.py   # Pydantic request/response models
  router.py    # APIRouter(prefix="/api/<name>", tags=["<name>"])
  data.py      # optional: static data, e.g. plant_quiz/data.py
```

- Gate routes with `Depends(require_approved_account)` (see any existing router for the pattern).
  Admin-only actions use `Depends(require_admin)` instead.
- Register the router in [backend/src/backend/main.py](backend/src/backend/main.py):
  `app.include_router(<name>_router, dependencies=[Depends(require_approved_account)])`.
- Generate + review + apply a migration:
  ```bash
  cd backend
  uv run alembic revision --autogenerate -m "add <name> tables"
  # review migrations/versions/<new file>.py — autogenerate misses renames/some constraints
  uv run alembic upgrade head
  ```
- Add tests under `backend/tests/`.

## 3. Register the tile

Tiles live in the `tiles` table, not in frontend code — create one via `POST /api/tiles/`
(`title`, `href`, `color`, `icon`). `icon` must be a key registered in
[frontend/src/lib/icons.ts](frontend/src/lib/icons.ts) (add one if needed — it maps to a
`lucide-react` icon). Non-admin accounts only see tiles they've been granted via
`account_tile_access` — grant access through the accounts/tile-access endpoints or the settings UI.

## 4. Frontend

- Add an API client under `frontend/src/lib/<name>.ts` (thin wrapper around `apiFetch`, see
  `frontend/src/lib/gameScores.ts` for the pattern) — skip if the feature has no backend.
- Add page(s) under `frontend/src/pages/`.
- Register route(s) in [frontend/src/App.tsx](frontend/src/App.tsx), matching the tile's `href`.
- Reuse `frontend/src/components/` (`Layout`, modals, etc.) where it fits; don't force shared
  components onto a feature that doesn't need them.

## 5. Verify

```bash
cd backend && uv run pytest -q && uv run ruff check .
cd frontend && npm run build   # type-checks + builds
```

## 6. Deploy

See [README.md](README.md#deployment). Push to `main` for the frontend (auto-deploys via GitHub
Actions); run `backend/deploy.sh` for the backend (builds/pushes the image, and the container runs
`alembic upgrade head` against the production Turso DB on startup — so migrations ship automatically
with the image).
