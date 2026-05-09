"""Allowed values for Client.billing_preference (coach-facing metadata only; no payment processing)."""

CLIENT_BILLING_PREFERENCE_VALUES: frozenset[str] = frozenset(
    {
        "unspecified",
        "membership_subscription",
        "app_invoices",
        "cash_in_person",
        "bank_transfer",
        "digital_wallet",
        "card_outside_app",
        "other",
    }
)
