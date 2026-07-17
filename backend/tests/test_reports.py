"""Tests for report create/list/get endpoints.

See conftest.py for the shared isolated-test-database setup.

`embed_image` is monkeypatched to a fixed fake vector rather than loading the
real CLIP model: downloading and running ViT-B-32 in every test run would make
the suite slow and dependent on network access, and correctness of the
embedding pipeline itself (endpoint wiring, storage, DB write) doesn't require
real embeddings — only a 512-dim vector shaped the way the schema expects.
"""

import io
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image

from app.main import app
from app.models.report import ReportEmbedding
from tests.conftest import TestSessionLocal

FAKE_EMBEDDING = [0.1] * 512


@pytest.fixture
async def client(_prepare_database, tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.storage.settings.image_storage_path", str(tmp_path))
    monkeypatch.setattr("app.api.reports.embed_image", lambda image: FAKE_EMBEDDING)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def sample_image_file() -> tuple[str, io.BytesIO, str]:
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), color=(255, 0, 0)).save(buf, format="PNG")
    buf.seek(0)
    return ("test.png", buf, "image/png")


def sample_form(**overrides) -> dict:
    form = {
        "report_type": "lost",
        "species": "dog",
        "breed": "beagle",
        "color": "brown",
        "description": "Friendly beagle, blue collar",
        "contact_info": "someone@example.com",
        "latitude": "37.7749",
        "longitude": "-122.4194",
        "event_date": "2026-07-10",
    }
    form.update(overrides)
    return form


async def create_report(client: AsyncClient, **form_overrides) -> dict:
    response = await client.post(
        "/api/reports",
        data=sample_form(**form_overrides),
        files={"image": sample_image_file()},
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_create_report_returns_created_report_with_embedding(client: AsyncClient):
    body = await create_report(client)

    assert "id" in body
    assert body["report_type"] == "lost"
    assert body["species"] == "dog"
    assert "embedding" not in body

    async with TestSessionLocal() as session:
        embedding_row = await session.get(ReportEmbedding, uuid.UUID(body["id"]))

    assert embedding_row is not None
    assert len(embedding_row.embedding) == 512


async def test_list_reports_returns_created_report(client: AsyncClient):
    created = await create_report(client, species="cat", report_type="found")

    response = await client.get("/api/reports")

    assert response.status_code == 200
    ids = [r["id"] for r in response.json()]
    assert created["id"] in ids


async def test_list_reports_filters_by_type_and_species(client: AsyncClient):
    lost_dog = await create_report(client, report_type="lost", species="dog")
    found_cat = await create_report(client, report_type="found", species="cat")

    response = await client.get("/api/reports", params={"report_type": "found", "species": "cat"})

    assert response.status_code == 200
    ids = [r["id"] for r in response.json()]
    assert found_cat["id"] in ids
    assert lost_dog["id"] not in ids


async def test_list_reports_filters_by_radius_and_reports_distance(client: AsyncClient):
    nearby = await create_report(client, latitude="37.78", longitude="-122.41")  # ~1km from SF center
    far = await create_report(client, latitude="40.7128", longitude="-74.0060")  # New York

    response = await client.get(
        "/api/reports", params={"lat": "37.7749", "lon": "-122.4194", "radius_km": "10"}
    )

    assert response.status_code == 200
    body = response.json()
    ids = [r["id"] for r in body]
    assert nearby["id"] in ids
    assert far["id"] not in ids

    nearby_item = next(r for r in body if r["id"] == nearby["id"])
    assert nearby_item["distance_km"] is not None
    assert nearby_item["distance_km"] < 10

    # without a location filter, distance_km is simply absent/None
    unfiltered = await client.get("/api/reports", params={"limit": 1})
    assert unfiltered.json()[0]["distance_km"] is None


async def test_get_report_by_id_returns_report(client: AsyncClient):
    created = await create_report(client)

    response = await client.get(f"/api/reports/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


async def test_get_report_by_id_returns_404_for_unknown_id(client: AsyncClient):
    response = await client.get(f"/api/reports/{uuid.uuid4()}")

    assert response.status_code == 404


async def test_create_report_rejects_invalid_report_type(client: AsyncClient):
    response = await client.post(
        "/api/reports",
        data=sample_form(report_type="missing"),
        files={"image": sample_image_file()},
    )

    assert response.status_code == 422


async def test_create_report_rejects_invalid_species(client: AsyncClient):
    response = await client.post(
        "/api/reports",
        data=sample_form(species="dragon"),
        files={"image": sample_image_file()},
    )

    assert response.status_code == 422
