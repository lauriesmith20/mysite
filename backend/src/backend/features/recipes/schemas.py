"""Pydantic request/response models for the recipes feature."""
import datetime

from pydantic import BaseModel


class Ingredient(BaseModel):
    name: str
    amount: float | None = None
    unit: str | None = None


class RecipeCreate(BaseModel):
    title: str
    image_url: str | None = None
    description: str
    servings: int | None = None
    ingredients: list[Ingredient]
    steps: list[str]
    tags: list[str] = []
    notes: str | None = None


class RecipeUpdate(BaseModel):
    title: str | None = None
    image_url: str | None = None
    description: str | None = None
    servings: int | None = None
    ingredients: list[Ingredient] | None = None
    steps: list[str] | None = None
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
    tags: list[str]
    notes: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}
