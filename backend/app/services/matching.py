"""Match-finding: given a report, find and rank candidates from the opposite report_type.

Candidates are pre-filtered in SQL (opposite report_type, same species, open
status, within radius_km via the haversine formula, event_date within
date_window_days in either direction), then similarity/distance/recency are
blended into a single score in Python and sorted — this keeps the weighting
logic easy to read and tune without embedding it inside a raw SQL expression.

Recency is measured as how fresh the *candidate* report is relative to now
(not relative to the source report's created_at) — simpler to implement, and
means a candidate's freshness score doesn't change depending on which report
you're viewing matches from.
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.report import Report, ReportEmbedding

EARTH_RADIUS_KM = 6371

OPPOSITE_TYPE = {"lost": "found", "found": "lost"}

# distance_km computed via the standard haversine formula (earth radius 6371km).
# similarity computed via pgvector's <=> cosine-distance operator (1 - distance = similarity).
# Filtering happens in the inner CTE; the outer query only exists so distance_km
# (an alias) can be used in a WHERE clause, which Postgres doesn't allow in the
# same SELECT level it's defined in.
_CANDIDATES_SQL = text(
    """
    WITH candidates AS (
        SELECT
            r.id, r.report_type, r.species, r.breed, r.color, r.description,
            r.contact_info, r.image_path, r.latitude, r.longitude,
            r.event_date, r.status, r.created_at,
            1 - (e.embedding <=> CAST(:source_embedding AS vector)) AS similarity,
            :earth_radius_km * 2 * asin(
                sqrt(
                    pow(sin(radians((r.latitude - :src_lat) / 2)), 2)
                    + cos(radians(:src_lat)) * cos(radians(r.latitude))
                    * pow(sin(radians((r.longitude - :src_lon) / 2)), 2)
                )
            ) AS distance_km
        FROM reports r
        JOIN report_embeddings e ON e.report_id = r.id
        WHERE r.report_type = :opposite_type
          AND r.species = :species
          AND r.status = 'open'
          AND r.id != :source_id
          AND abs(r.event_date - :source_event_date) <= :date_window_days
    )
    SELECT *
    FROM candidates
    WHERE distance_km <= :radius_km
    """
)


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


async def find_matches(
    db: AsyncSession,
    report_id: UUID,
    radius_km: float | None = None,
    date_window_days: int | None = None,
    w_visual: float | None = None,
    w_distance: float | None = None,
    w_recency: float | None = None,
    limit: int | None = None,
) -> tuple[Report, list[dict]]:
    radius_km = settings.match_radius_km if radius_km is None else radius_km
    date_window_days = settings.match_date_window_days if date_window_days is None else date_window_days
    w_visual = settings.match_w_visual if w_visual is None else w_visual
    w_distance = settings.match_w_distance if w_distance is None else w_distance
    w_recency = settings.match_w_recency if w_recency is None else w_recency
    limit = settings.match_limit if limit is None else limit

    source = await db.get(Report, report_id)
    if source is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    source_embedding_row = await db.get(ReportEmbedding, report_id)
    vector_literal = "[" + ",".join(str(float(v)) for v in source_embedding_row.embedding) + "]"

    result = await db.execute(
        _CANDIDATES_SQL,
        {
            "source_embedding": vector_literal,
            "earth_radius_km": EARTH_RADIUS_KM,
            "src_lat": source.latitude,
            "src_lon": source.longitude,
            "opposite_type": OPPOSITE_TYPE[source.report_type],
            "species": source.species,
            "source_id": source.id,
            "source_event_date": source.event_date,
            "date_window_days": date_window_days,
            "radius_km": radius_km,
        },
    )
    rows = result.mappings().all()

    now = datetime.now(timezone.utc)
    candidates: list[dict] = []
    for row in rows:
        similarity = _clamp01(float(row["similarity"]))
        distance_km = float(row["distance_km"])
        distance_component = _clamp01(1 - (distance_km / radius_km)) if radius_km > 0 else 0.0

        days_since_created = (now - row["created_at"]).total_seconds() / 86400
        recency_component = _clamp01(1 - (days_since_created / date_window_days)) if date_window_days > 0 else 0.0

        score = w_visual * similarity + w_distance * distance_component + w_recency * recency_component

        candidates.append(
            {
                "id": row["id"],
                "report_type": row["report_type"],
                "species": row["species"],
                "breed": row["breed"],
                "color": row["color"],
                "description": row["description"],
                "contact_info": row["contact_info"],
                "image_path": row["image_path"],
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "event_date": row["event_date"],
                "status": row["status"],
                "created_at": row["created_at"],
                "similarity": similarity,
                "distance_km": distance_km,
                "score": score,
            }
        )

    candidates.sort(key=lambda c: c["score"], reverse=True)
    return source, candidates[:limit]
