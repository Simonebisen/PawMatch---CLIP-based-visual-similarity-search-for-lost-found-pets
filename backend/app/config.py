"""Application configuration.

Loads settings from environment variables and an optional `.env` file using
pydantic-settings. See `.env.example` at the repo root for the expected keys.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Core app metadata
    app_name: str = "Lost & Found Pet Matcher"
    environment: str = "development"
    debug: bool = True

    # Database connection string, e.g.
    # postgresql+asyncpg://user:password@postgres:5432/petmatcher
    db_url: str = "postgresql+asyncpg://petmatcher:petmatcher@localhost:5432/petmatcher"

    # Where uploaded images are stored on disk (local storage for now).
    image_storage_path: str = "/data/images"

    # Matching algorithm defaults (overridable per-request via query params
    # on GET /api/reports/{id}/matches).
    match_radius_km: float = 25.0
    match_date_window_days: int = 45
    match_w_visual: float = 0.6
    match_w_distance: float = 0.25
    match_w_recency: float = 0.15
    match_limit: int = 20

    # Comma-separated list of origins allowed to call the API cross-origin.
    # Only exercised when the frontend calls the API directly from the
    # browser (e.g. a separately-hosted static frontend); the Vite dev proxy
    # and the prod nginx proxy both make same-origin requests instead.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()


settings = get_settings()
