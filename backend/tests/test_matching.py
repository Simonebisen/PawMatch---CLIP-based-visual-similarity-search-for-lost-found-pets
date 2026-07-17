"""Tests for GET /api/reports/{id}/matches.

See conftest.py for the shared isolated-test-database setup.

These tests insert reports directly via the test DB session (same pattern as
scripts/seed.py) rather than mocking embed_image behind the POST endpoint —
that gives exact control over each report's embedding vector, which is what
makes the similarity/ranking assertions below deterministic instead of
depending on real CLIP output. Each test uses its own far-apart "home"
coordinates so candidates from different tests can never leak into each
other's radius-filtered results, without needing per-test DB cleanup.

We *don't* reuse the literal Phase 2 seed report ids here: this suite must
stay hermetic (pass on a fresh checkout / in CI without the seed script or
dataset having been run first), and the isolated test database is a different
database than the one the seed script populates. The seed report ids were
verified manually instead — see the summary in the final response, which
shows the real obvious pair ranking #1 with similarity 1.0 against actual
CLIP embeddings in the dev database.
"""

from datetime import date, timedelta
from uuid import uuid4

from httpx import AsyncClient

from app.models.report import Report, ReportEmbedding
from tests.conftest import TestSessionLocal

DIM = 512


def unit_vector(index: int) -> list[float]:
    v = [0.0] * DIM
    v[index] = 1.0
    return v


BASE_VECTOR = unit_vector(0)  # source direction
ORTHOGONAL_VECTOR = unit_vector(1)  # cosine similarity 0.0 against BASE_VECTOR
PARTIAL_VECTOR = [0.7071067811865476, 0.7071067811865476] + [0.0] * (DIM - 2)  # similarity ~0.707 against BASE_VECTOR


async def make_report(
    *,
    report_type: str,
    species: str,
    vector: list[float],
    lat: float,
    lon: float,
    event_date: date,
    breed: str = "Test Breed",
    color: str = "black",
) -> Report:
    async with TestSessionLocal() as session:
        report = Report(
            report_type=report_type,
            species=species,
            breed=breed,
            color=color,
            description="test report",
            contact_info="test@example.com",
            image_path="/data/images/test.jpg",
            latitude=lat,
            longitude=lon,
            event_date=event_date,
            status="open",
        )
        session.add(report)
        await session.flush()
        session.add(ReportEmbedding(report_id=report.id, embedding=vector))
        await session.commit()
        await session.refresh(report)
        return report


async def test_obvious_pair_ranks_in_top_3_with_high_similarity(client: AsyncClient, _prepare_database):
    lat, lon = 39.7, -104.9
    today = date.today()

    source = await make_report(
        report_type="lost", species="dog", vector=BASE_VECTOR, lat=lat, lon=lon, event_date=today
    )
    true_match = await make_report(
        report_type="found",
        species="dog",
        vector=BASE_VECTOR,  # identical embedding = "same photo" obvious pair
        lat=lat + 0.01,  # ~1.1km away
        lon=lon,
        event_date=today + timedelta(days=3),
    )
    # noise candidates: same species/type/window, but visually dissimilar
    for i in range(3):
        await make_report(
            report_type="found",
            species="dog",
            vector=ORTHOGONAL_VECTOR,
            lat=lat + 0.02,
            lon=lon + 0.01 * i,
            event_date=today + timedelta(days=2),
        )

    response = await client.get(f"/api/reports/{source.id}/matches")
    assert response.status_code == 200
    body = response.json()

    top_3_ids = [m["id"] for m in body["matches"][:3]]
    assert str(true_match.id) in top_3_ids

    matched = next(m for m in body["matches"] if m["id"] == str(true_match.id))
    assert matched["similarity"] > 0.99, f"expected near-1.0 similarity for identical embeddings, got {matched['similarity']}"


async def test_species_filter_excludes_other_species(client: AsyncClient, _prepare_database):
    lat, lon = 45.0, -93.0
    today = date.today()

    source = await make_report(report_type="lost", species="dog", vector=BASE_VECTOR, lat=lat, lon=lon, event_date=today)
    matching_dog = await make_report(
        report_type="found", species="dog", vector=BASE_VECTOR, lat=lat, lon=lon, event_date=today
    )
    other_cat = await make_report(
        report_type="found", species="cat", vector=BASE_VECTOR, lat=lat, lon=lon, event_date=today
    )

    response = await client.get(f"/api/reports/{source.id}/matches")
    assert response.status_code == 200
    ids = [m["id"] for m in response.json()["matches"]]

    assert str(matching_dog.id) in ids
    assert str(other_cat.id) not in ids


async def test_candidates_outside_radius_are_excluded(client: AsyncClient, _prepare_database):
    lat, lon = 51.5, -0.1
    today = date.today()

    source = await make_report(report_type="lost", species="dog", vector=BASE_VECTOR, lat=lat, lon=lon, event_date=today)
    nearby = await make_report(
        report_type="found",
        species="dog",
        vector=BASE_VECTOR,
        lat=lat + 0.02,  # ~2.2km away
        lon=lon,
        event_date=today,
    )

    # default radius (25km) should include it
    default_response = await client.get(f"/api/reports/{source.id}/matches")
    assert str(nearby.id) in [m["id"] for m in default_response.json()["matches"]]

    # a tiny radius should exclude it
    tiny_radius_response = await client.get(f"/api/reports/{source.id}/matches", params={"radius_km": 0.1})
    assert str(nearby.id) not in [m["id"] for m in tiny_radius_response.json()["matches"]]


async def test_matches_404_for_unknown_report_id(client: AsyncClient, _prepare_database):
    response = await client.get(f"/api/reports/{uuid4()}/matches")
    assert response.status_code == 404


async def test_weights_change_ranking_order(client: AsyncClient, _prepare_database):
    lat, lon = -33.8, 151.2
    today = date.today()

    source = await make_report(report_type="lost", species="dog", vector=BASE_VECTOR, lat=lat, lon=lon, event_date=today)

    # high similarity, but far away (near the edge of the default 25km radius)
    far_but_identical = await make_report(
        report_type="found", species="dog", vector=BASE_VECTOR, lat=lat + 0.2, lon=lon, event_date=today
    )
    # lower similarity, but very close by
    close_but_different = await make_report(
        report_type="found", species="dog", vector=PARTIAL_VECTOR, lat=lat + 0.001, lon=lon, event_date=today
    )

    visual_heavy = await client.get(
        f"/api/reports/{source.id}/matches",
        params={"w_visual": 1.0, "w_distance": 0.0, "w_recency": 0.0},
    )
    distance_heavy = await client.get(
        f"/api/reports/{source.id}/matches",
        params={"w_visual": 0.0, "w_distance": 1.0, "w_recency": 0.0},
    )

    assert visual_heavy.json()["matches"][0]["id"] == str(far_but_identical.id)
    assert distance_heavy.json()["matches"][0]["id"] == str(close_but_different.id)
