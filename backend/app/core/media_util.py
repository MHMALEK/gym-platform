import mimetypes
import re
import uuid
from pathlib import Path

from app.core.config import settings

ALLOWED_MEDIA_TYPES = frozenset(
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "video/mp4",
        "video/webm",
    }
)


def content_type_allowed(content_type: str) -> bool:
    ct = (content_type or "").split(";")[0].strip().lower()
    return bool(ct) and ct in ALLOWED_MEDIA_TYPES


def extension_for_type(content_type: str) -> str:
    ct = content_type.split(";")[0].strip().lower()
    ext = mimetypes.guess_extension(ct, strict=False)
    if ext == ".jpe":
        ext = ".jpg"
    return ext or ".bin"


def safe_filename_stem(name: str | None, max_len: int = 80) -> str:
    if not name:
        return "file"
    base = Path(name).name
    base = re.sub(r"[^a-zA-Z0-9._-]+", "_", base)[:max_len].strip("._") or "file"
    return base


def build_storage_rel_path(coach_id: int, content_type: str) -> str:
    ext = extension_for_type(content_type)
    return f"{coach_id}/{uuid.uuid4().hex}{ext}"


def absolute_upload_path(rel_path: str) -> Path:
    base = settings.media_upload_dir.resolve()
    target = (base / rel_path).resolve()
    try:
        target.relative_to(base)
    except ValueError:
        raise ValueError("Invalid storage path") from None
    return target


def build_public_url(rel_or_url_path: str) -> str:
    """Local assets use /uploads/{rel_path}; registered URLs may be full https URLs."""
    if rel_or_url_path.startswith(("http://", "https://")):
        return rel_or_url_path
    rel = rel_or_url_path.lstrip("/")
    path_part = f"/uploads/{rel}"
    base = settings.media_public_base_url.rstrip("/")
    if base:
        return f"{base}{path_part}"
    return path_part


def delete_local_file_if_exists(rel_path: str) -> None:
    if rel_path.startswith(("http://", "https://")):
        return
    try:
        p = absolute_upload_path(rel_path)
        if p.is_file():
            p.unlink()
    except ValueError:
        pass
