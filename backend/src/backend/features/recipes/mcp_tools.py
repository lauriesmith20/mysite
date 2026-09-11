"""MCP tools for the recipes feature (mirrors router.py's HTTP endpoints)."""
from mcp.server.mcpserver.exceptions import ToolError

from backend.database import SessionLocal
from backend.features.recipes.models import Recipe
from backend.features.recipes.schemas import RecipeCreate, RecipeRead, RecipeUpdate
from backend.mcp.server import mcp_server


def _to_read(recipe: Recipe) -> dict:
    return RecipeRead.model_validate(recipe).model_dump(mode="json")


@mcp_server.tool()
def list_recipes() -> list[dict]:
    """List every saved recipe. Check this before creating one, to update an existing recipe
    (by id) instead of creating a duplicate."""
    with SessionLocal() as db:
        recipes = db.query(Recipe).order_by(Recipe.title).all()
        return [_to_read(r) for r in recipes]


@mcp_server.tool()
def get_recipe(recipe_id: int) -> dict:
    """Get a single recipe by id."""
    with SessionLocal() as db:
        recipe = db.get(Recipe, recipe_id)
        if recipe is None:
            raise ToolError(f"Recipe {recipe_id} not found")
        return _to_read(recipe)


@mcp_server.tool()
def create_recipe(recipe: RecipeCreate) -> dict:
    """Create a new recipe. Call list_recipes first to avoid creating a duplicate."""
    with SessionLocal() as db:
        row = Recipe(**recipe.model_dump())
        db.add(row)
        db.commit()
        db.refresh(row)
        return _to_read(row)


@mcp_server.tool()
def update_recipe(recipe_id: int, updates: RecipeUpdate) -> dict:
    """Update fields of an existing recipe by id. Only include fields that changed."""
    with SessionLocal() as db:
        row = db.get(Recipe, recipe_id)
        if row is None:
            raise ToolError(f"Recipe {recipe_id} not found")
        for field, value in updates.model_dump(exclude_unset=True).items():
            setattr(row, field, value)
        db.commit()
        db.refresh(row)
        return _to_read(row)


@mcp_server.tool()
def delete_recipe(recipe_id: int) -> dict:
    """Delete a recipe by id."""
    with SessionLocal() as db:
        row = db.get(Recipe, recipe_id)
        if row is None:
            raise ToolError(f"Recipe {recipe_id} not found")
        db.delete(row)
        db.commit()
        return {"deleted": True, "id": recipe_id}
