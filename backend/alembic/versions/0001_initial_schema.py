"""Initial schema: reports + report_embeddings

Revision ID: 0001
Revises:
Create Date: 2026-07-14
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

EMBEDDING_DIM = 512


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "reports",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("report_type", sa.Text(), nullable=False),
        sa.Column("species", sa.Text(), nullable=False),
        sa.Column("breed", sa.Text(), nullable=True),
        sa.Column("color", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("contact_info", sa.Text(), nullable=False),
        sa.Column("image_path", sa.Text(), nullable=False),
        sa.Column("latitude", sa.Double(), nullable=False),
        sa.Column("longitude", sa.Double(), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="open"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint("report_type IN ('lost', 'found')", name="ck_reports_report_type"),
        sa.CheckConstraint("species IN ('dog', 'cat', 'other')", name="ck_reports_species"),
        sa.CheckConstraint("status IN ('open', 'resolved', 'expired')", name="ck_reports_status"),
    )
    op.create_index("idx_reports_type_species", "reports", ["report_type", "species"])
    op.create_index("idx_reports_location", "reports", ["latitude", "longitude"])

    op.create_table(
        "report_embeddings",
        sa.Column(
            "report_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("reports.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=False),
    )
    op.execute(
        "CREATE INDEX ON report_embeddings "
        "USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    )


def downgrade() -> None:
    op.drop_table("report_embeddings")
    op.drop_index("idx_reports_location", table_name="reports")
    op.drop_index("idx_reports_type_species", table_name="reports")
    op.drop_table("reports")
