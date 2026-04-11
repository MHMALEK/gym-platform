"""Lightweight hooks for future notifications (email, WhatsApp). No providers wired."""

import logging
from typing import Any

logger = logging.getLogger(__name__)


def emit_invoice_event(event: str, payload: dict[str, Any]) -> None:
    """Call when invoice lifecycle changes; replace with queue/webhook later."""
    logger.debug("invoice_event %s %s", event, payload)
