"""Pydantic request/response models for homepage navigation tiles."""
from pydantic import BaseModel


class TileCreate(BaseModel):
    title: str
    href: str
    color: str
    icon: str | None = None


class TileRead(BaseModel):
    id: int
    title: str
    href: str
    color: str
    icon: str | None

    model_config = {"from_attributes": True}
