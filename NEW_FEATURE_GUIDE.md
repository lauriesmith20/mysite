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
- Add page(s) under `frontend/src/pages/`. Every page renders inside `<Page>` from
  `frontend/src/shared/layout/Page.tsx` (it owns `<main>`, spacing, title and actions). Top-level pages
  (tile destinations) pass no `back`; pages two levels deep pass `back={{ to, label }}` for an inline
  arrow next to the title. `npm run lint` enforces this, and that `shared/` never imports feature code.
- Register route(s) in [frontend/src/App.tsx](frontend/src/App.tsx), matching the tile's `href`.
- Reuse `frontend/src/components/` (`Layout`, modals, etc.) where it fits; don't force shared
  components onto a feature that doesn't need them.

## Adding a once-a-day puzzle game (shared results + score history)

Daily games (Country Hopper today) share one backend table, API and history page, so a new one needs
no new tables or migration:

1. **Backend:** add an entry to `GAMES` in
   [backend/src/backend/features/daily_games/registry.py](backend/src/backend/features/daily_games/registry.py)
   (`key`, `title`, `max_score`, and a `rank` function saying how two results compare, with
   `rank_labels` naming each tiebreak step). The routes under `/api/daily-games/<key>/results` then
   work for it, and so do rivalries (below).
2. **Frontend registry:** add an entry to `DAILY_GAMES` in
   [frontend/src/lib/dailyGameRegistry.ts](frontend/src/lib/dailyGameRegistry.ts) (title, play path,
   max score, score icon, and `describe` for the one-line detail in history rows).
3. **The game page:** when the game ends and the player is signed in (`useOptionalAuth() !== null`,
   so it still works for guests), call `submitResult(key, { puzzle_date, score, outcome, details })`
   from `lib/dailyGames.ts`. `puzzle_date` is the player's local `YYYY-MM-DD`. Put whatever you need to
   restore the finished game in `details`, and on load use `getResult(key, day)` to restore it, so a day
   can't be replayed from another device. Link to `/games/<key>/history` once the game is complete.

**Games played elsewhere (e.g. Wordle on nytimes.com)** can't be read from the browser, so players paste their
share text. Give the frontend entry a `paste` block with a `parse` function that turns the pasted text into
a result (or null if it isn't recognised, which shows "<Game> result not detected"), and give the backend
entry a `validate` function that re-checks the result hangs together (e.g. Wordle's puzzle number must be
the one for that day). The `PasteResultButton` then appears on the game's rivalry page and history page.
See `frontend/src/lib/wordle.ts` and the `wordle` entries in both registries.

**Rivalries come for free.** A registered game appears in the "Challenge to a daily game" picker on a
friend's rivalry page. Once they accept, each puzzle day is won by whoever ranks higher (per the game's
`rank`), scores count days won, and a friend's result is only shown after you've finished that day.
It counts from the day the challenge was accepted (that whole day, even if one of you had already
played it); earlier days never count. To show rivals on the game's result screen, call
`listRivalsForDay(key, day)` after `submitResult` resolves (see `CountryHopperPage`). The rivalry page also plays a
3-2-1 reveal of today's result (`RivalReveal`: confetti if you won, red crosses if they did) the first time
both of you have played, once per rivalry per day, with a "Replay reveal" link.

The first result recorded per account, game and day is final (re-posting returns the stored one), and
`/games/<key>/history` (streaks, average, list) works for any registered game.

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
