from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Directory that contains the `app` package (the backend project root).
_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Gym Coach API"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "sqlite+aiosqlite:///./dev.db"

    @field_validator("database_url", mode="after")
    @classmethod
    def resolve_sqlite_path(cls, v: str) -> str:
        """Anchor relative SQLite file paths to the backend root so the DB is stable regardless of process cwd."""
        if not v.startswith("sqlite"):
            return v
        if "///" not in v:
            return v
        prefix, _, rest = v.partition("///")
        query = ""
        path_part = rest
        if "?" in path_part:
            path_part, _, q = path_part.partition("?")
            query = f"?{q}"
        file_path = Path(path_part)
        if file_path.is_absolute():
            return v
        resolved = (_BACKEND_ROOT / file_path).resolve()
        return f"{prefix}///{resolved.as_posix()}{query}"

    # Firebase Admin SDK: path to service account JSON, or set GOOGLE_APPLICATION_CREDENTIALS
    firebase_credentials_path: str | None = None

    # HMAC-pepper for hashing coach API keys (MCP / machine clients). Set in production.
    api_key_pepper: str = "change-me-in-production"

    # Dev only: skip Firebase verification (set false in production)
    dev_bypass_auth: bool = False
    # Dev only: when dev_bypass_auth is True, allow requests with no Authorization/X-API-Key or
    # X-API-Key in dev_mcp_api_key_aliases (comma-separated) to resolve the dev coach for MCP tests.
    dev_mcp_api_key_aliases: str = "dev,test,bypass"
    dev_firebase_uid: str = "dev-coach-uid"
    dev_coach_email: str = "dev@example.com"
    dev_coach_name: str = "Dev Coach"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # POST /api/v1/billing/run-renewals — empty disables the endpoint (403).
    billing_cron_secret: str = ""

    # Local media uploads (multipart POST /media/upload). Use object storage + register in production if preferred.
    media_upload_dir: Path = _BACKEND_ROOT / "uploads"
    media_max_upload_bytes: int = 52_428_800  # 50 MiB
    # If set (e.g. https://api.example.com), public_url in API responses is absolute; else relative /uploads/...
    media_public_base_url: str = ""
    media_max_assets_per_exercise: int = 24

    @field_validator("media_upload_dir", mode="after")
    @classmethod
    def resolve_media_upload_dir(cls, v: Path) -> Path:
        if v.is_absolute():
            return v
        return (_BACKEND_ROOT / v).resolve()


settings = Settings()
