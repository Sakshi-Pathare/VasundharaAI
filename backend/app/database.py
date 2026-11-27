from contextlib import contextmanager
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.exc import DBAPIError, OperationalError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import BACKEND_DIR, logger, settings

DATABASE_URL = settings.database_url

engine_options = {"pool_pre_ping": True}
if settings.is_sqlite:
    engine_options["connect_args"] = {
        "check_same_thread": False,
        "timeout": 30,
    }
else:
    # PostgreSQL production connection pool configuration
    engine_options["pool_size"] = 10
    engine_options["max_overflow"] = 20
    engine_options["pool_recycle"] = 1800

engine = create_engine(DATABASE_URL, **engine_options)

# Enable Write-Ahead Logging (WAL) and busy timeout on SQLite to prevent locking collisions
if settings.is_sqlite:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA busy_timeout=30000")
        finally:
            cursor.close()

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

REPORT_COLUMNS = {
    "jurisdiction_status": "VARCHAR(24) NOT NULL DEFAULT 'pending'",
    "municipality_id": "VARCHAR(32)",
    "ward_id": "VARCHAR(80)",
    "zone_id": "VARCHAR(80)",
    "jurisdiction_assignment_source": "VARCHAR(40) NOT NULL DEFAULT 'unresolved'",
    "jurisdiction_assignment_date": "DATETIME",
    "citizen_user_id": "VARCHAR(32)",
    "internal_notes": "TEXT NOT NULL DEFAULT ''",
    "is_archived": "BOOLEAN NOT NULL DEFAULT 0",
    "archived_at": "DATETIME",
}


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """Dependency generator yielding an active database session with automatic error rollback."""
    db = SessionLocal()
    try:
        yield db
    except Exception as exc:
        db.rollback()
        logger.error(f"Database session rolled back due to error: {exc}")
        raise
    finally:
        db.close()


@contextmanager
def transaction_scope(db: Session):
    """Transactional context manager ensuring atomic commits and rollbacks."""
    try:
        yield db
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error(f"Transaction rolled back due to error: {exc}")
        raise


def check_database_health() -> tuple[bool, str]:
    """Checks database connectivity with dialect reporting."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True, engine.dialect.name
    except Exception as exc:
        logger.error(f"Database health check failed: {exc}")
        return False, str(exc)


def migrate_existing_schema():
    """Lightweight runtime column synchronizer for backward compatibility."""
    table_names = inspect(engine).get_table_names()
    datetime_type = "TIMESTAMP WITH TIME ZONE" if engine.dialect.name == "postgresql" else "DATETIME"
    boolean_type = "BOOLEAN DEFAULT FALSE" if engine.dialect.name == "postgresql" else "BOOLEAN NOT NULL DEFAULT 0"

    if "reports" in table_names:
        columns = {column["name"] for column in inspect(engine).get_columns("reports")}
        report_columns = dict(REPORT_COLUMNS)
        report_columns["jurisdiction_assignment_date"] = datetime_type
        report_columns["archived_at"] = datetime_type
        report_columns["is_archived"] = boolean_type

        with engine.begin() as connection:
            for column_name, definition in report_columns.items():
                if column_name not in columns:
                    logger.info(f"Adding missing column '{column_name}' to 'reports' table")
                    connection.execute(text(f"ALTER TABLE reports ADD COLUMN {column_name} {definition}"))
            # Upgrade image_url column to TEXT for Base64 Data URI persistence in PostgreSQL
            if engine.dialect.name == "postgresql":
                try:
                    connection.execute(text("ALTER TABLE reports ALTER COLUMN image_url TYPE TEXT;"))
                except Exception as exc:
                    logger.warning(f"Could not alter reports.image_url type: {exc}")

    if "cleanups" in table_names:
        cleanup_cols = {column["name"] for column in inspect(engine).get_columns("cleanups")}
        cleanup_columns = {
            "after_image_uploaded_at": datetime_type,
            "after_image_uploaded_by": "VARCHAR(80)",
            "completion_notes": "TEXT DEFAULT ''",
            "verification_status": "VARCHAR(32) DEFAULT 'pending'",
            "verified_at": datetime_type,
            "verified_by": "VARCHAR(80)",
            "verification_notes": "TEXT DEFAULT ''",
        }
        with engine.begin() as connection:
            for column_name, definition in cleanup_columns.items():
                if column_name not in cleanup_cols:
                    logger.info(f"Adding missing column '{column_name}' to 'cleanups' table")
                    connection.execute(text(f"ALTER TABLE cleanups ADD COLUMN {column_name} {definition}"))
            # Upgrade before/after image URLs to TEXT on PostgreSQL
            if engine.dialect.name == "postgresql":
                try:
                    connection.execute(text("ALTER TABLE cleanups ALTER COLUMN before_image_url TYPE TEXT;"))
                    connection.execute(text("ALTER TABLE cleanups ALTER COLUMN after_image_url TYPE TEXT;"))
                except Exception as exc:
                    logger.warning(f"Could not alter cleanups image columns type: {exc}")
