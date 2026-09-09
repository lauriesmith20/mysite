# Backend

FastAPI + SQLAlchemy backend. SQLite locally, Azure SQL in production.

## Database migrations (Alembic)

Schema changes are managed with [Alembic](https://alembic.sqlalchemy.org/) — `Base.metadata.create_all()` is no longer used.

After changing a model in `src/backend/features/*/models.py`:

```bash
uv run alembic revision --autogenerate -m "describe the change"
```

Review the generated file in `migrations/versions/` (autogenerate misses renames and some constraint changes), then apply it:

```bash
uv run alembic upgrade head
```

New environments (fresh clone, fresh `app.db`) just need `uv run alembic upgrade head` to create the schema. The Docker image runs this automatically on container start.
