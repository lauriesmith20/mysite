"""Test fixtures. Points the app at a throwaway SQLite db, independent of dev's app.db/migrations."""
import os
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mktemp(suffix='.db')}"

from backend.database import Base, engine
from backend.features.accounts import (
    models as _accounts_models,  # noqa: F401
)
from backend.features.game_scores import (
    models as _game_scores_models,  # noqa: F401
)
from backend.features.tiles import models as _tiles_models  # noqa: F401

Base.metadata.create_all(bind=engine)

from backend.auth import require_approved_account
from backend.features.accounts.models import AccountStatus, AllowedAccount
from backend.main import app

_test_account = AllowedAccount(
    id=1, email="test@example.com", display_name="Test User", status=AccountStatus.APPROVED
)
app.dependency_overrides[require_approved_account] = lambda: _test_account

