"""Pydantic request/response schemas for reports.

Kept separate from the SQLAlchemy models in app/models/report.py: these
control what the API accepts and returns, not what's persisted.
"""

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

ReportType = Literal["lost", "found"]
Species = Literal["dog", "cat", "other"]
Status = Literal["open", "resolved", "expired"]


class ReportRead(BaseModel):
    """Report as returned to clients. Deliberately excludes the embedding vector."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    report_type: ReportType
    species: Species
    breed: str | None
    color: str | None
    description: str | None
    contact_info: str
    image_path: str
    latitude: float
    longitude: float
    event_date: date
    status: Status
    created_at: datetime


class ReportListItem(ReportRead):
    """A report as returned by GET /api/reports.

    distance_km is only populated when the request included a lat/lon/radius_km
    location filter; otherwise it's None.
    """

    distance_km: float | None = None


class MatchResult(ReportRead):
    """A candidate report ranked against a source report by the matching algorithm."""

    similarity: float
    distance_km: float
    score: float


class MatchResponse(BaseModel):
    """Response envelope for GET /api/reports/{id}/matches: source report + ranked candidates."""

    source: ReportRead
    matches: list[MatchResult]
