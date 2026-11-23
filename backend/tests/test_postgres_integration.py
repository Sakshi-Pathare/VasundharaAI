import os
from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine, select, text
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import sessionmaker
from sqlalchemy.schema import CreateIndex, CreateTable

from app.config import settings
from app.database import Base, check_database_health, transaction_scope
from app.models import (
    AuditLog,
    AuthSession,
    Cleanup,
    Municipality,
    Notification,
    Report,
    User,
    WardBoundary,
    utc_now,
)

pg_dialect = postgresql.dialect()


def test_postgresql_ddl_compilation_all_models():
    """Validates that all application models compile valid PostgreSQL DDL statements."""
    for table in Base.metadata.sorted_tables:
        create_stmt = CreateTable(table).compile(dialect=pg_dialect)
        sql_text = str(create_stmt).strip()
        assert len(sql_text) > 0
        assert table.name in sql_text
        # Ensure PostgreSQL-specific datatypes and constraints compile correctly
        if table.name == "reports":
            assert "latitude" in sql_text
            assert "longitude" in sql_text
            assert "chk_report_latitude" in sql_text
            assert "chk_report_longitude" in sql_text
            assert "chk_report_estimated_kg" in sql_text
        if table.name == "cleanups":
            assert "chk_cleanup_status" in sql_text


def test_postgresql_indexes_compilation():
    """Validates that all performance and spatial indexes compile under PostgreSQL dialect."""
    table_reports = Base.metadata.tables["reports"]
    report_index_names = {idx.name for idx in table_reports.indexes}

    assert "ix_reports_status" in report_index_names
    assert "ix_reports_reported_at" in report_index_names
    assert "ix_reports_coordinates" in report_index_names
    assert "ix_reports_municipality_ward" in report_index_names
    assert "ix_reports_jurisdiction_status" in report_index_names
    assert "ix_reports_archived" in report_index_names

    for idx in table_reports.indexes:
        compiled_idx = str(CreateIndex(idx).compile(dialect=pg_dialect))
        assert "CREATE INDEX" in compiled_idx or "CREATE UNIQUE INDEX" in compiled_idx

    table_cleanups = Base.metadata.tables["cleanups"]
    cleanup_index_names = {idx.name for idx in table_cleanups.indexes}
    assert "ix_cleanups_status" in cleanup_index_names
    assert "ix_cleanups_created_at" in cleanup_index_names


def test_cleanup_history_preserved_on_report_deletion():
    """Verifies that foreign key ON DELETE SET NULL preserves cleanup history even if report is removed."""
    cleanup_fk = next(fk for fk in Base.metadata.tables["cleanups"].foreign_keys if fk.parent.name == "report_id")
    assert cleanup_fk.ondelete == "SET NULL", "Cleanup foreign key must specify ondelete='SET NULL' to safeguard history"


def test_persistence_across_simulated_backend_restart(tmp_path):
    """Simulates a complete backend restart: engine teardown, fresh engine creation, and record verification."""
    db_file = tmp_path / "restart_test.db"
    test_db_url = f"sqlite:///{db_file.as_posix()}"

    # Stage 1: Initial startup & record creation
    engine1 = create_engine(test_db_url)
    Base.metadata.create_all(bind=engine1)
    Session1 = sessionmaker(bind=engine1)

    with Session1() as db:
        muni = Municipality(
            id="MUN-PUN",
            code="PMC",
            name="Pune Municipal Corporation",
            boundary_source="Official Pune GeoJSON",
        )
        report = Report(
            id="REP-001",
            title="Plastic Dumping in Mula River",
            description="Severe accumulation along riverbank",
            latitude=18.5204,
            longitude=73.8567,
            category="plastic",
            severity="high",
            status="scheduled",
            estimated_kg=120.0,
            image_url="/static/uploads/river-dump.jpg",
            municipality_id="MUN-PUN",
        )
        cleanup = Cleanup(
            id="CLN-001",
            report_id="REP-001",
            task_name="Mula Riverbank Cleanup Drive",
            location="Deccan Gymkhana, Pune",
            assigned_team="PMC Rapid Sanitation Unit 3",
            status="in_progress",
            before_image_url="/static/uploads/river-dump.jpg",
        )
        db.add_all([muni, report, cleanup])
        db.commit()

    engine1.dispose()

    # Stage 2: Backend restart (fresh connection pool, fresh Session maker)
    engine2 = create_engine(test_db_url)
    Session2 = sessionmaker(bind=engine2)

    with Session2() as db:
        retrieved_report = db.get(Report, "REP-001")
        assert retrieved_report is not None
        assert retrieved_report.title == "Plastic Dumping in Mula River"
        assert retrieved_report.image_url == "/static/uploads/river-dump.jpg"
        assert retrieved_report.latitude == 18.5204
        assert retrieved_report.longitude == 73.8567

        retrieved_cleanup = db.get(Cleanup, "CLN-001")
        assert retrieved_cleanup is not None
        assert retrieved_cleanup.task_name == "Mula Riverbank Cleanup Drive"
        assert retrieved_cleanup.status == "in_progress"
        assert retrieved_cleanup.report_id == "REP-001"

    engine2.dispose()


def test_transaction_rollback_prevents_partial_corrupt_data(tmp_path):
    """Verifies that an unhandled error inside transaction_scope rolls back all changes atomically."""
    test_db_url = f"sqlite:///{tmp_path / 'rollback_test.db'}"
    engine = create_engine(test_db_url)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)

    with pytest.raises(RuntimeError):
        with Session() as db:
            with transaction_scope(db):
                muni = Municipality(id="M-TEMP", code="TEMP", name="Temporary City")
                db.add(muni)
                db.flush()
                # Simulate mid-transaction crash
                raise RuntimeError("Simulated mid-transaction failure")

    with Session() as db:
        assert db.get(Municipality, "M-TEMP") is None, "Failed transaction must not leave committed records"

    engine.dispose()


def test_live_postgresql_if_configured():
    """Runs genuine integration tests against PostgreSQL when a live instance is provided."""
    postgres_url = os.getenv("TEST_POSTGRESQL_URL") or os.getenv("POSTGRES_DATABASE_URL")
    if not postgres_url or not postgres_url.startswith("postgresql"):
        pytest.skip("No live PostgreSQL instance configured in TEST_POSTGRESQL_URL; dialect compilation verified.")

    pg_engine = create_engine(postgres_url, pool_pre_ping=True)
    try:
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"Configured PostgreSQL server unreachable: {exc}")

    Base.metadata.drop_all(bind=pg_engine)
    Base.metadata.create_all(bind=pg_engine)
    PgSession = sessionmaker(bind=pg_engine)

    with PgSession() as db:
        muni = Municipality(id="M-PG-01", code="PGMC", name="Postgres City")
        report = Report(
            id="R-PG-01",
            title="Postgres Verified Report",
            latitude=18.52,
            longitude=73.85,
            municipality_id="M-PG-01",
            estimated_kg=15.0,
        )
        db.add_all([muni, report])
        db.commit()

        retrieved = db.get(Report, "R-PG-01")
        assert retrieved is not None
        assert retrieved.title == "Postgres Verified Report"

    Base.metadata.drop_all(bind=pg_engine)
    pg_engine.dispose()
