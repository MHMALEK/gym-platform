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

    # Dev only: skip Firebase verification (set false in production)
    dev_bypass_auth: bool = False
    dev_firebase_uid: str = "dev-coach-uid"
    dev_coach_email: str = "dev@example.com"
    dev_coach_name: str = "Dev Coach"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"


settings = Settings()
