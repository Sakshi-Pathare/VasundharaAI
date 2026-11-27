# ==============================================================================
# Vasundhara AI (EcoWatch AI) — Backend Production Dockerfile
# Multi-stage, non-root, hardened Python ASGI container
# ==============================================================================

# STAGE 1: Builder
FROM python:3.11-slim AS builder

WORKDIR /build

# Install compilation dependencies for C-extensions (psycopg, pillow, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# STAGE 2: Production Runtime
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libjpeg62-turbo \
    zlib1g \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder stage
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Create non-root application user and group for defense-in-depth
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/bash -m appuser

# Create persistent storage directories with appropriate permissions
RUN mkdir -p /app/uploads /app/backups /app/models /app/data && \
    chown -R appuser:appgroup /app

# Copy application source code
COPY --chown=appuser:appgroup backend /app/backend

# Switch to non-root user
USER appuser

# Environment defaults
ENV PYTHONPATH=/app/backend \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    API_HOST=0.0.0.0 \
    API_PORT=8001 \
    UPLOAD_DIR=/app/uploads

EXPOSE 8001

# Healthcheck probe using the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Production ASGI server entrypoint
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2", "--proxy-headers", "--forwarded-allow-ips", "*"]
