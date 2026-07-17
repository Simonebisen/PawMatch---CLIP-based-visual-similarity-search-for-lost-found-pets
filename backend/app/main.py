"""FastAPI application entrypoint."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.reports import router as reports_router
from app.config import settings
from app.services.embedding import load_model


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Eager-load the CLIP model once at startup so the first request isn't slow.
    load_model()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

# Neither the dev Vite proxy nor the prod nginx proxy trigger this (both
# make same-origin requests) — it only matters if something calls the API
# directly cross-origin. Configurable via CORS_ORIGINS so prod doesn't ship
# with dev's localhost:5173 baked in.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports_router)

# Serve uploaded/seeded report photos so the frontend can render them —
# report.image_path is a server filesystem path, not a URL on its own.
# Must exist before mounting: StaticFiles errors at startup if the directory
# is missing, which it would be on a completely fresh volume with no uploads
# yet (the images dir is otherwise created lazily on first upload).
Path(settings.image_storage_path).mkdir(parents=True, exist_ok=True)
app.mount("/api/images", StaticFiles(directory=settings.image_storage_path), name="images")


@app.get("/api/health")
async def health() -> dict[str, str]:
    """Liveness probe used by Docker Compose and the test suite."""
    return {"status": "ok"}
