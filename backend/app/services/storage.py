"""Local-disk image storage.

Saves uploaded images under IMAGE_STORAGE_PATH with a generated filename.
This is the local-disk implementation for now; it'll be swapped for
S3-compatible storage later without changing the call sites.
"""

import uuid
from pathlib import Path

from fastapi import UploadFile

from app.config import settings


def save_image_bytes(contents: bytes, suffix: str = ".jpg", prefix: str = "") -> str:
    """Write raw image bytes to IMAGE_STORAGE_PATH under a generated filename."""
    storage_dir = Path(settings.image_storage_path)
    storage_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{prefix}{uuid.uuid4()}{suffix}"
    dest = storage_dir / filename
    dest.write_bytes(contents)

    return str(dest)


async def save_upload_image(image: UploadFile) -> tuple[str, bytes]:
    """Persist an uploaded image to disk.

    Returns (saved file path, raw image bytes) — the bytes are returned too
    so the caller can embed the image without re-reading it from disk.
    """
    suffix = Path(image.filename or "").suffix or ".jpg"
    contents = await image.read()
    dest = save_image_bytes(contents, suffix=suffix)

    return dest, contents


def delete_image(path: str) -> None:
    """Best-effort cleanup of a previously saved image."""
    Path(path).unlink(missing_ok=True)
