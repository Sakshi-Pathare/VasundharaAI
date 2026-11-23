from pathlib import Path
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import BACKEND_DIR, logger, settings

DATABASE_URL = settings.database_url

engine_options = {"pool_pre_ping": True}
if settings.is_sqlite:
    engine_options["connect_args"] = {
        "check_same_thread": False,
        "timeout": 30,
    }
else:
    # PostgreSQL / MySQL connection pool settings
    engine_options["pool_size"] = 10
    engine_options["max_overflow"] = 20

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
}


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_existing_schema():
    if "reports" not in inspect(engine).get_table_names():
        return
    columns = {column["name"] for column in inspect(engine).get_columns("reports")}
    datetime_type = "TIMESTAMP WITH TIME ZONE" if engine.dialect.name == "postgresql" else "DATETIME"
    report_columns = dict(REPORT_COLUMNS)
    report_columns["jurisdiction_assignment_date"] = datetime_type
    with engine.begin() as connection:
        for column_name, definition in report_columns.items():
            if column_name not in columns:
                logger.info(f"Adding missing column '{column_name}' to 'reports' table")
                connection.execute(text(f"ALTER TABLE reports ADD COLUMN {column_name} {definition}"))
