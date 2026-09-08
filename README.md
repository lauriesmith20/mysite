# Personal Website

A personal website: a home page of tiles, each linking to a small self-contained feature
(game score tracking, and whatever else comes next).

## Stack

- **Frontend**: [frontend/](frontend) — React + TypeScript + Vite + Tailwind CSS, hosted on GitHub Pages.
- **Backend**: [backend/](backend) — FastAPI + SQLAlchemy, hosted on Azure Container Apps (consumption/free tier).
  SQLite locally, Azure SQL in production.
- **Auth**: Microsoft Entra ID (Azure AD) bearer-token validation, scaffolded in
  [backend/src/backend/auth.py](backend/src/backend/auth.py) — disabled until you register an
  Entra app and set the relevant env vars.

## Getting started

### Backend

```bash
cd backend
cp .env.example .env
uv sync
uv run uvicorn backend.main:app --reload
```

Runs at http://localhost:8000, with docs at http://localhost:8000/docs.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Runs at http://localhost:5173.

## Adding a new mini-feature

- Backend: add a subpackage under `backend/src/backend/features/<name>/` with its own router,
  models, and schemas, then register the router in [backend/src/backend/main.py](backend/src/backend/main.py).
- Frontend: add a page under `frontend/src/pages/`, a route in
  [frontend/src/App.tsx](frontend/src/App.tsx), and an entry in
  [frontend/src/features.ts](frontend/src/features.ts) so it shows up as a tile on the home page.

## Deployment

- Frontend deploys automatically to GitHub Pages via
  [.github/workflows/deploy-frontend.yml](.github/workflows/deploy-frontend.yml) on pushes to `main`
  (requires GitHub Pages enabled with "GitHub Actions" as the source).
- Backend deploys to Azure Container Apps via [backend/deploy.sh](backend/deploy.sh):

  ```bash
  cd backend
  gh auth refresh -h github.com -s write:packages,read:packages,delete:packages  # once
  ./deploy.sh
  ```

  This uses `gh auth token` for the GHCR push (no PAT needs to be created or stored), builds/pushes
  a Docker image to GHCR, creates the Container Apps environment and an Azure Files share for
  SQLite persistence (skipped if `DATABASE_URL` points at Azure SQL instead), and deploys the
  container with scale-to-zero enabled. See the script header for all configurable env vars
  (resource group, location, CORS origins, Entra ID settings, etc).

