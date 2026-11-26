import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session

from .api import UPLOAD_DIR, api
from .config import logger, settings
from .database import Base, SessionLocal, engine, get_db, migrate_existing_schema
from .security import bootstrap_initial_data, bootstrap_super_admin
from .vision import detector_status


@asynccontextmanager
async def lifespan(_: FastAPI):
    if os.getenv("TESTING") == "1":
        yield
        return

    logger.info(f"Starting Vasundhara AI API [Environment: {settings.environment}]")
    logger.info(f"Database dialect: {engine.dialect.name} | URL: {settings.database_url.split('@')[-1]}")
    logger.info(f"Upload directory configured at: {UPLOAD_DIR}")
    logger.info(f"CORS allowed origins: {settings.cors_origins}")

    Base.metadata.create_all(bind=engine)
    migrate_existing_schema()
    with SessionLocal() as db:
        bootstrap_initial_data(db)
    yield
    logger.info("Shutting down Vasundhara AI API.")


app = FastAPI(
    title="Vasundhara AI API",
    description="Municipality-routed litter reports, isolated municipal operations, cleanup workflows, and analytics.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_connected = False
    try:
        db.execute(select(1))
        db_connected = True
    except Exception as exc:
        logger.error(f"Database health check failed: {exc}")

    return {
        "status": "ok" if db_connected else "degraded",
        "service": "vasundhara-ai-api",
        "version": "2.0.0",
        "environment": settings.environment,
        "database": "connected" if db_connected else "disconnected",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "detector": detector_status(),
    }


app.include_router(api)
