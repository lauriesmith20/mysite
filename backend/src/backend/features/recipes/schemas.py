"""Pydantic request/response models for the recipes feature."""
import datetime
from typing import Literal, get_args

from pydantic import BaseModel

RecipeCategory = Literal["meals", "baking", "other"]
RECIPE_CATEGORIES: tuple[str, ...] = get_args(RecipeCategory)


class Ingredient(BaseModel):
    name: str
    amount: float | None = None
    unit: str | None = None


class StepDetail(BaseModel):
    """Cooking-mode extras for one step; `step_details[i]` belongs to `steps[i]`."""

    timer_seconds: int | None = None
    ingredients: list[str] = []


class RecipeCreate(BaseModel):
    title: str
    image_url: str | None = None
    description: str
    servings: int | None = None
    ingredients: list[Ingredient]
    steps: list[str]
    step_details: list[StepDetail] | None = None
    category: RecipeCategory = "other"
    tags: list[str] = []
    notes: str | None = None


class RecipeUpdate(BaseModel):
    title: str | None = None
    image_url: str | None = None
    description: str | None = None
    servings: int | None = None
    ingredients: list[Ingredient] | None = None
    steps: list[str] | None = None
    step_details: list[StepDetail] | None = None
    category: RecipeCategory | None = None
    tags: list[str] | None = None
    notes: str | None = None


class RecipeRead(BaseModel):
    id: int
    title: str
    image_url: str | None
    description: str
    servings: int | None
    ingredients: list[Ingredient]
    steps: list[str]
    step_details: list[StepDetail] | None
    category: RecipeCategory
    tags: list[str]
    notes: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}
