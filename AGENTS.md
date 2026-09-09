# AGENTS.md

Project overview and stack: see [README.md](README.md).

## Adding a new feature/tile

Follow [NEW_FEATURE_GUIDE.md](NEW_FEATURE_GUIDE.md) end-to-end (backend subpackage + migration,
tile registration, frontend page/route, verification, deploy). Each tile is a self-contained
mini-app and can have very different functionality — don't force a feature into a shape it doesn't
need.

## Key gotchas

- Production DB is Turso (`TURSO_DATABASE_URL` in `backend/.env`), not the local
  `DATABASE_URL` (`sqlite:///./app.db`) used for dev — `backend/deploy.sh` handles this mapping,
  don't override `DATABASE_URL` manually when deploying.
- Migrations run automatically on container start (`alembic upgrade head` in `backend/Dockerfile`'s
  `CMD`) — no separate migration step needed when deploying.
- Frontend deploys automatically on push to `main` via GitHub Actions; backend deploys manually via
  `backend/deploy.sh`.
