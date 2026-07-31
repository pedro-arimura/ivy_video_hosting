import os
from pathlib import Path


class Settings:
    """Reads configuration from environment variables.

    All values have sensible defaults so the app runs out-of-the-box
    locally (SQLite + local disk storage) and is configured via env vars
    in production (PostgreSQL via DATABASE_URL, S3-compatible storage).
    """

    def __init__(self) -> None:
        self.database_url = os.getenv("DATABASE_URL", "").strip()

        self.data_dir = os.getenv("DATA_DIR", "./data")

        self.jwt_secret = os.getenv("JWT_SECRET", "dev-secret-change-me-in-production")
        self.jwt_expires_minutes = int(os.getenv("JWT_EXPIRES_MINUTES", str(60 * 24 * 7)))

        self.storage_backend = os.getenv("STORAGE", "auto").strip().lower()
        self.s3_bucket = os.getenv("S3_BUCKET", "").strip()
        self.s3_endpoint_url = os.getenv("S3_ENDPOINT_URL", "").strip()
        self.s3_access_key = os.getenv(
            "S3_ACCESS_KEY_ID", os.getenv("S3_ACCESS_KEY", "")
        ).strip()
        self.s3_secret_key = os.getenv(
            "S3_SECRET_ACCESS_KEY", os.getenv("S3_SECRET_KEY", "")
        ).strip()
        self.s3_region = os.getenv("S3_REGION", "auto").strip() or "auto"

        self.cors_origins = [
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "*").split(",")
            if origin.strip()
        ]

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith(
            "postgres://"
        ) or self.database_url.startswith("postgresql://")

    @property
    def db_path(self) -> Path:
        return Path(self.data_dir) / "app.db"

    @property
    def files_dir(self) -> Path:
        return Path(self.data_dir) / "files"

    @property
    def use_s3(self) -> bool:
        if self.storage_backend == "local":
            return False
        if self.storage_backend == "s3":
            return bool(self.s3_bucket and self.s3_endpoint_url)
        return bool(
            self.s3_bucket
            and self.s3_endpoint_url
            and self.s3_access_key
            and self.s3_secret_key
        )


settings = Settings()
