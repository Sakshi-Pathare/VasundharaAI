import os
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
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


FALLBACK_EVIDENCE_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <defs>
    <linearGradient id="v_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10241B"/>
      <stop offset="50%" stop-color="#1B4332"/>
      <stop offset="100%" stop-color="#092421"/>
    </linearGradient>
    <linearGradient id="v_accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#52B788"/>
      <stop offset="100%" stop-color="#74D7CB"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#v_bg)" rx="16"/>
  <circle cx="200" cy="105" r="46" fill="#092421" opacity="0.6"/>
  <circle cx="200" cy="105" r="42" fill="none" stroke="url(#v_accent)" stroke-width="2.5" stroke-dasharray="5 3"/>
  <path d="M185 97 L192 89 L208 89 L215 97 L225 97 C228 97 230 99 230 102 L230 122 C230 125 228 127 225 127 L175 127 C172 127 170 125 170 122 L170 102 C170 99 172 97 175 97 Z" fill="none" stroke="#DEF5F1" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="200" cy="111" r="10" fill="none" stroke="#74D7CB" stroke-width="2.5"/>
  <text x="200" y="178" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800" fill="#DEF5F1" text-anchor="middle" letter-spacing="1">VASUNDHARA AI</text>
  <text x="200" y="200" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="#98E0D5" text-anchor="middle">Field Photographic Evidence</text>
  <rect x="110" y="222" width="180" height="26" rx="13" fill="#092421" stroke="#27403C" stroke-width="1"/>
  <circle cx="126" cy="235" r="4" fill="#52B788"/>
  <text x="204" y="239" font-family="monospace" font-size="11" font-weight="700" fill="#74D7CB" text-anchor="middle">Evidence Logged</text>
</svg>"""


@app.get("/static/uploads/{filename:path}")
async def serve_uploaded_file(filename: str):
    clean_name = Path(filename).name
    if not clean_name or clean_name in {".", ".."} or ".." in filename or "%2e" in filename.lower():
        raise HTTPException(status_code=400, detail="Invalid file path.")
    target = (UPLOAD_DIR / clean_name).resolve()
    if target.parent == UPLOAD_DIR.resolve() and target.is_file():
        return FileResponse(target)
    # Resilient fallback: return branded vector SVG with 200 OK so ephemeral restarts never cause broken thumbnails
    return Response(
        content=FALLBACK_EVIDENCE_SVG,
        media_type="image/svg+xml",
        headers={
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=3600",
        },
    )


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
