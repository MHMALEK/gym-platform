from fastapi import APIRouter, Header, HTTPException, status

from app.api.deps import DbSession
from app.core.config import settings
from app.services.invoice_billing import run_renewal_invoices_for_all_coaches

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/run-renewals")
async def run_renewals(
    db: DbSession,
    x_billing_secret: str | None = Header(None, alias="X-Billing-Secret"),
):
    if not settings.billing_cron_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing cron is not configured (set billing_cron_secret)",
        )
    if not x_billing_secret or x_billing_secret != settings.billing_cron_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid billing secret")
    result = await run_renewal_invoices_for_all_coaches(db)
    await db.commit()
    return result
