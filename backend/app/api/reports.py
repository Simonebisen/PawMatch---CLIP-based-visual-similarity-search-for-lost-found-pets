"""Report create/list/get/match endpoints."""

import io
import uuid
from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.report import Report, ReportEmbedding
from app.schemas.report import MatchResponse, MatchResult, ReportListItem, ReportRead, ReportType, Species
from app.services.embedding import embed_image
from app.services.matching import EARTH_RADIUS_KM, find_matches
from app.services.storage import delete_image, save_upload_image

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_type: ReportType = Form(...),
    species: Species = Form(...),
    contact_info: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    event_date: date = Form(...),
    breed: str | None = Form(None),
    color: str | None = Form(None),
    description: str | None = Form(None),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> Report:
    image_path, contents = await save_upload_image(image)

    try:
        pil_image = Image.open(io.BytesIO(contents))
        vector = embed_image(pil_image)

        report = Report(
            report_type=report_type,
            species=species,
            breed=breed,
            color=color,
            description=description,
            contact_info=contact_info,
            image_path=image_path,
            latitude=latitude,
            longitude=longitude,
            event_date=event_date,
        )
        db.add(report)
        await db.flush()

        db.add(ReportEmbedding(report_id=report.id, embedding=vector))
        await db.commit()
        await db.refresh(report)
    except Exception:
        delete_image(image_path)
        raise

    return report


@router.get("", response_model=list[ReportListItem])
async def list_reports(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    report_type: ReportType | None = Query(None),
    species: Species | None = Query(None),
    lat: float | None = Query(None, ge=-90, le=90),
    lon: float | None = Query(None, ge=-180, le=180),
    radius_km: float | None = Query(None, gt=0),
    db: AsyncSession = Depends(get_db),
) -> list[ReportListItem]:
    has_location_filter = lat is not None and lon is not None and radius_km is not None

    if has_location_filter:
        # Same haversine formula as services/matching.py, expressed via
        # SQLAlchemy's func.* so it composes with the plain ORM query below
        # instead of needing raw SQL.
        distance_km_expr = EARTH_RADIUS_KM * 2 * func.asin(
            func.sqrt(
                func.pow(func.sin(func.radians((Report.latitude - lat) / 2)), 2)
                + func.cos(func.radians(lat))
                * func.cos(func.radians(Report.latitude))
                * func.pow(func.sin(func.radians((Report.longitude - lon) / 2)), 2)
            )
        )
        stmt = select(Report, distance_km_expr.label("distance_km"))
    else:
        stmt = select(Report)

    if report_type is not None:
        stmt = stmt.where(Report.report_type == report_type)
    if species is not None:
        stmt = stmt.where(Report.species == species)

    if has_location_filter:
        stmt = stmt.where(distance_km_expr <= radius_km).order_by(distance_km_expr)
    else:
        stmt = stmt.order_by(Report.created_at.desc())

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)

    if has_location_filter:
        return [
            ReportListItem(**ReportRead.model_validate(report).model_dump(), distance_km=distance)
            for report, distance in result.all()
        ]
    return [ReportListItem.model_validate(report) for report in result.scalars().all()]


@router.get("/{report_id}", response_model=ReportRead)
async def get_report(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Report:
    report = await db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report


@router.get("/{report_id}/matches", response_model=MatchResponse)
async def get_report_matches(
    report_id: uuid.UUID,
    radius_km: float | None = Query(None, gt=0),
    date_window_days: int | None = Query(None, gt=0),
    w_visual: float | None = Query(None, ge=0),
    w_distance: float | None = Query(None, ge=0),
    w_recency: float | None = Query(None, ge=0),
    limit: int | None = Query(None, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> MatchResponse:
    source, candidates = await find_matches(
        db,
        report_id,
        radius_km=radius_km,
        date_window_days=date_window_days,
        w_visual=w_visual,
        w_distance=w_distance,
        w_recency=w_recency,
        limit=limit,
    )
    return MatchResponse(
        source=ReportRead.model_validate(source),
        matches=[MatchResult.model_validate(c) for c in candidates],
    )
