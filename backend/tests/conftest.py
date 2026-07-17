"""Shared pytest fixtures: isolated test database + dependency override.

Requires a reachable Postgres instance with the pgvector extension available
(point DB_URL at it, e.g. the `postgres` service in docker/docker-compose.yml
exposed on localhost:5432 — see the root README for the exact command).

Tests run against a *separate* `<db>_test` database (derived from DB_URL, e.g.
petmatcher -> petmatcher_test), never the dev database — the docker-compose
postgres service creates it automatically on first init (see
docker/initdb/01-create-test-db.sh). This matters because `_prepare_database`
creates and *drops* tables around the test session; running that against the
dev database would wipe it out from under a running API container.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app


def _test_db_url() -> str:
    root, _, dbname = settings.db_url.rpartition("/")
    return f"{root}/{dbname}_test"


test_engine = create_async_engine(_test_db_url(), future=True)
TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False)


async def _override_get_db():
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture(scope="session")
async def _prepare_database():
    async with test_engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
        await conn.run_sync(Base.metadata.create_all)

    app.dependency_overrides[get_db] = _override_get_db

    yield

    app.dependency_overrides.pop(get_db, None)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest.fixture
async def client(_prepare_database):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
