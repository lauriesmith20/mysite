"""Test fixtures. Points the app at a throwaway SQLite db, independent of dev's app.db/migrations."""
import os
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mktemp(suffix='.db')}"

from backend.database import Base, SessionLocal, engine
from backend.features.accounts import (
    models as _accounts_models,  # noqa: F401
)
from backend.features.beer_bets import models as _beer_bets_models  # noqa: F401
from backend.features.friends import models as _friends_models  # noqa: F401
from backend.features.game_scores import (
    models as _game_scores_models,  # noqa: F401
)
from backend.features.recipes import models as _recipes_models  # noqa: F401
from backend.features.tiles import models as _tiles_models  # noqa: F401

Base.metadata.create_all(bind=engine)

from backend.auth import require_approved_account
from backend.features.accounts.models import AccountStatus, AllowedAccount
from backend.main import app

_test_account = AllowedAccount(
    id=1, email="test@example.com", display_name="Test User", status=AccountStatus.APPROVED
)
app.dependency_overrides[require_approved_account] = lambda: _test_account

# Persisted so features that look accounts up by id (friends, beer bets) can find them.
_db = SessionLocal()
_db.add(_test_account)
_db.add(
    AllowedAccount(
        id=2, email="friend@example.com", display_name="Friend User", status=AccountStatus.APPROVED
    )
)
_db.add(
    AllowedAccount(
        id=3, email="friend2@example.com", display_name="Friend Two", status=AccountStatus.APPROVED
    )
)
_db.commit()
# Refresh + expunge (rather than just close) so _test_account's attributes stay loaded and
# accessible even though it's no longer attached to a session — otherwise accessing an attribute
# post-commit (autoexpired) raises DetachedInstanceError once this session is closed.
_db.refresh(_test_account)
_db.expunge(_test_account)
_db.close()

