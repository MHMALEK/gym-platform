import hashlib
import secrets

from app.core.config import settings

KEY_PREFIX = "gck_"


def hash_raw_key(raw: str) -> str:
    pepper = (settings.api_key_pepper or "").strip() or "unset-pepper"
    return hashlib.sha256(f"{pepper}:{raw}".encode("utf-8")).hexdigest()


def generate_api_key_pair() -> tuple[str, str, str]:
    """Returns (plaintext, prefix_for_display, sha256_hex_hash)."""
    secret = secrets.token_urlsafe(32)
    raw = f"{KEY_PREFIX}{secret}"
    prefix = raw[:16] + "…"
    return raw, prefix, hash_raw_key(raw)
