"""
Placeholder for a future payment provider (Stripe, Zarinpal, etc.).

Wire a real adapter that implements PaymentProvider and register it in settings.
Webhooks should set Invoice.status, paid_at, external_payment_id, payment_provider.
"""

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class PaymentProvider(Protocol):
    """Future: create hosted checkout and parse provider webhooks."""

    async def create_checkout_session(self, invoice_id: int, coach_id: int) -> dict[str, Any]:
        """Return { checkout_url: str | None, external_id: str | None, ... }."""
        ...

    async def handle_webhook(self, payload: bytes, headers: dict[str, str]) -> None:
        ...


class NoOpPaymentProvider:
    """Default until a real provider is configured."""

    async def create_checkout_session(self, invoice_id: int, coach_id: int) -> dict[str, Any]:
        return {"checkout_url": None, "status": "not_configured", "invoice_id": invoice_id}

    async def handle_webhook(self, payload: bytes, headers: dict[str, str]) -> None:
        return None
