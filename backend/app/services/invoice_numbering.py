"""Per-coach sequential invoice references: INV-{year}-{seq:05d}."""

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.coach_invoice_sequence import CoachInvoiceSequence


async def allocate_next_reference(db: AsyncSession, coach_id: int) -> str:
    year = date.today().year
    result = await db.execute(
        select(CoachInvoiceSequence).where(
            CoachInvoiceSequence.coach_id == coach_id,
            CoachInvoiceSequence.year == year,
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        row = CoachInvoiceSequence(coach_id=coach_id, year=year, last_number=0)
        db.add(row)
        await db.flush()
    row.last_number += 1
    await db.flush()
    return f"INV-{year}-{row.last_number:05d}"
