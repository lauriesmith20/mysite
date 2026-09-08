# Feature routers

Each mini-feature (e.g. game score tracking) should live in its own subpackage here,
with its own router, models, and schemas, e.g.:

```
features/
  game_scores/
    __init__.py
    router.py    # APIRouter, included in backend.main
    models.py    # SQLAlchemy models
    schemas.py   # Pydantic request/response models
```

Register each feature's router in [`backend/main.py`](../main.py).
