"""SQLAlchemy engine/session setup. Works with local SQLite and Turso (libSQL) in production."""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from backend.config import get_settings

settings = get_settings()

connect_args: dict[str, object] = {}
if settings.database_url.startswith("sqlite:"):
    # Plain SQLite needs this connect_arg when used from multiple threads (as FastAPI does).
    connect_args = {"check_same_thread": False}
elif settings.database_url.startswith("sqlite+libsql:") and settings.turso_auth_token:
    connect_args = {"auth_token": settings.turso_auth_token}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
