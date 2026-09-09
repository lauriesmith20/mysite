"""Application configuration, loaded from environment variables / .env file."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "local"

    # SQLite locally; a "sqlite+libsql://<db>.turso.io?secure=true" URL in production (Turso).
    database_url: str = "sqlite:///./app.db"
    # Auth token for Turso, kept separate from database_url so it's never logged as part of the URL.
    turso_auth_token: str | None = None

    # Comma-separated list of allowed CORS origins (e.g. the GitHub Pages site).
    cors_origins: str = "http://localhost:5173"

    # Microsoft Entra ID (Azure AD) settings, used to validate bearer tokens.
    # Leave unset locally to disable auth-protected routes.
    azure_ad_tenant_id: str | None = None
    azure_ad_client_id: str | None = None
    azure_ad_api_audience: str | None = None

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def auth_enabled(self) -> bool:
        return bool(self.azure_ad_tenant_id and self.azure_ad_client_id)


@lru_cache
def get_settings() -> Settings:
    return Settings()
