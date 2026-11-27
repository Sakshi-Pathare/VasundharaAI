import logging
import os
from pathlib import Path
from typing import List

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
# Load .env file from backend directory if present
load_dotenv(BACKEND_DIR / ".env")


class Settings:
    """Centralized application settings for Vasundhara AI backend."""

    def __init__(self):
        self.environment: str = os.getenv("ENVIRONMENT", "development").lower()
        self.api_host: str = os.getenv("API_HOST", "0.0.0.0")
        self.api_port: int = int(os.getenv("API_PORT", "8001"))
        self.log_level: str = os.getenv("LOG_LEVEL", "INFO").upper()

        # Database URL (defaults to local SQLite with WAL mode enabled)
        default_sqlite = f"sqlite:///{(BACKEND_DIR / 'vasundhara.db').as_posix()}"
        self.database_url: str = os.getenv("DATABASE_URL", default_sqlite)

        # CORS Configuration
        raw_cors = os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173",
        )
        self.cors_origins: List[str] = [
            origin.strip() for origin in raw_cors.split(",") if origin.strip()
        ]

        # File Uploads
        upload_env = os.getenv("UPLOAD_DIR", "backend/uploads")
        upload_path = Path(upload_env)
        if not upload_path.is_absolute():
            upload_path = (BACKEND_DIR.parent / upload_env).resolve()
        self.upload_dir: Path = upload_path
        self.max_image_bytes: int = int(os.getenv("MAX_IMAGE_BYTES", str(8 * 1024 * 1024)))

        # Super Admin Initial Bootstrap Credentials
        self.superadmin_email: str = os.getenv("VASUNDHARA_SUPERADMIN_EMAIL") or os.getenv("ECOWATCH_SUPERADMIN_EMAIL", "")
        self.superadmin_password: str = os.getenv("VASUNDHARA_SUPERADMIN_PASSWORD") or os.getenv("ECOWATCH_SUPERADMIN_PASSWORD", "")

        # Geospatial & ML Settings
        self.boundary_margin_meters: float = float(
            os.getenv("JURISDICTION_BOUNDARY_MARGIN_METERS", "25.0")
        )
        self.yolo_model_path: str = os.getenv("YOLO_MODEL_PATH", "").strip()

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


settings = Settings()

# Configure standardized logging
logging.basicConfig(
    level=getattr(logging, settings.log_level, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("vasundhara_ai")
