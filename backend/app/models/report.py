"""ORM models for reports and their CLIP embeddings."""

import uuid
from datetime import date, datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import CheckConstraint, Date, DateTime, Double, ForeignKey, Index, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

EMBEDDING_DIM = 512


class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (
        CheckConstraint("report_type IN ('lost', 'found')", name="ck_reports_report_type"),
        CheckConstraint("species IN ('dog', 'cat', 'other')", name="ck_reports_species"),
        CheckConstraint("status IN ('open', 'resolved', 'expired')", name="ck_reports_status"),
        Index("idx_reports_type_species", "report_type", "species"),
        Index("idx_reports_location", "latitude", "longitude"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    report_type: Mapped[str] = mapped_column(Text, nullable=False)
    species: Mapped[str] = mapped_column(Text, nullable=False)
    breed: Mapped[str | None] = mapped_column(Text)
    color: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    contact_info: Mapped[str] = mapped_column(Text, nullable=False)
    image_path: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[float] = mapped_column(Double, nullable=False)
    longitude: Mapped[float] = mapped_column(Double, nullable=False)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="open")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    embedding: Mapped["ReportEmbedding"] = relationship(
        back_populates="report", uselist=False, cascade="all, delete-orphan"
    )


class ReportEmbedding(Base):
    __tablename__ = "report_embeddings"

    report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), primary_key=True
    )
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIM), nullable=False)

    report: Mapped["Report"] = relationship(back_populates="embedding")
