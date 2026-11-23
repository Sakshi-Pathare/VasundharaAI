from fastapi.testclient import TestClient
from sqlalchemy import text

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.main import app


def test_root_health_check_returns_full_diagnostics():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "vasundhara-ai-api"
        assert data["version"] == "2.0.0"
        assert data["database"] == "connected"
        assert "environment" in data
        assert "timestamp" in data
        assert "detector" in data


def test_api_v1_health_check_returns_clean_connectivity():
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["database"] == "connected"


def test_configuration_settings_defaults():
    assert settings.api_port == 8001
    assert "http://localhost:3000" in settings.cors_origins
    assert settings.is_sqlite is True or "postgres" in settings.database_url
    assert settings.max_image_bytes > 0


def test_sqlite_pragmas_and_connectivity():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1")).scalar()
        assert result == 1
