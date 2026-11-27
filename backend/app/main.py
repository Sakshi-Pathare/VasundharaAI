import os
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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


@app.middleware("http")
async def request_tracking_and_security_headers_middleware(request: Request, call_next):
    """
    Assigns unique request correlation ID, records latency,
    logs request telemetry, and enforces security headers.
    """
    raw_req_id = request.headers.get("X-Request-ID")
    if raw_req_id and len(raw_req_id) <= 64 and raw_req_id.replace("-", "").isalnum():
        request_id = raw_req_id
    else:
        request_id = f"req_{uuid.uuid4().hex[:16]}"

    request.state.request_id = request_id
    start_time = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception as exc:
        duration_ms = (time.perf_counter() - start_time) * 1000.0
        client_ip = request.client.host if request.client else "unknown"
        logger.error(
            f"[{request_id}] {client_ip} \"{request.method} {request.url.path}\" EXCEPTION in {duration_ms:.2f}ms: {exc}"
        )
        raise

    duration_ms = (time.perf_counter() - start_time) * 1000.0
    client_ip = request.client.host if request.client else "unknown"

    # Log telemetry for non-health endpoints or slow/error requests
    if not request.url.path.startswith("/health") or response.status_code >= 400:
        log_level = logger.warning if response.status_code >= 400 else logger.info
        log_level(
            f"[{request_id}] {client_ip} \"{request.method} {request.url.path}\" {response.status_code} ({duration_ms:.2f}ms)"
        )

    # Attach response headers
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail if isinstance(exc.detail, str) else "Request error",
                "details": exc.detail if not isinstance(exc.detail, str) else None,
            },
            "requestId": request_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", None)
    safe_errors = jsonable_encoder(exc.errors())
    logger.warning(f"[{request_id}] Request validation error: {safe_errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": safe_errors,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed. Please check field requirements.",
                "details": safe_errors,
            },
            "requestId": request_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.exception(f"[{request_id}] Unhandled server exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Please reference the request ID when reporting this issue.",
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred.",
            },
            "requestId": request_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
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


@app.get("/ready")
def readiness_check(response: Response, db: Session = Depends(get_db)):
    """
    Readiness probe for load balancers and orchestrators.
    Returns 200 only when database is reachable and upload storage is writable.
    """
    checks = {
        "database": False,
        "storage": False,
        "detector": False,
    }

    try:
        db.execute(select(1))
        checks["database"] = True
    except Exception as exc:
        logger.error(f"Readiness DB probe failed: {exc}")

    try:
        checks["storage"] = os.path.isdir(UPLOAD_DIR) and os.access(UPLOAD_DIR, os.W_OK)
    except Exception as exc:
        logger.error(f"Readiness Storage probe failed: {exc}")

    try:
        status_info = detector_status()
        checks["detector"] = status_info.get("status") in {"ready", "degraded", "disabled"}
    except Exception:
        checks["detector"] = True

    is_ready = checks["database"] and checks["storage"]
    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ready" if is_ready else "not_ready",
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


app.include_router(api)
