import json
import logging
from pathlib import Path

import firebase_admin
from firebase_admin import auth, credentials
from firebase_admin.exceptions import FirebaseError

from app.core.config import settings

logger = logging.getLogger(__name__)
_app_initialized = False


def init_firebase() -> None:
    global _app_initialized
    if _app_initialized or settings.dev_bypass_auth:
        return
    if settings.firebase_credentials_path:
        path = Path(settings.firebase_credentials_path)
        if path.is_file():
            cred = credentials.Certificate(str(path))
            firebase_admin.initialize_app(cred)
            _app_initialized = True
            logger.info("Firebase Admin initialized from credentials file")
            return
    try:
        firebase_admin.initialize_app()
        _app_initialized = True
        logger.info("Firebase Admin initialized from default credentials")
    except ValueError:
        # Already initialized
        _app_initialized = True
    except Exception as e:
        logger.warning("Firebase Admin not initialized: %s", e)


def verify_firebase_token(id_token: str) -> dict:
    if settings.dev_bypass_auth:
        return {
            "uid": settings.dev_firebase_uid,
            "email": settings.dev_coach_email,
            "name": settings.dev_coach_name,
        }
    init_firebase()
    try:
        decoded = auth.verify_id_token(id_token)
        return {
            "uid": decoded["uid"],
            "email": decoded.get("email") or "",
            "name": decoded.get("name") or decoded.get("email") or "Coach",
        }
    except FirebaseError as e:
        raise ValueError(str(e)) from e
