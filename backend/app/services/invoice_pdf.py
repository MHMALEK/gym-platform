"""Render a simple PDF for an invoice (client-facing notes only)."""

from io import BytesIO

from fpdf import FPDF

from app.models.coach import Coach
from app.models.invoice import Invoice


def render_invoice_pdf(*, invoice: Invoice, coach: Coach, client_name: str) -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Invoice", ln=True)
    pdf.set_font("Helvetica", size=11)
    pdf.cell(0, 8, f"From: {coach.name}", ln=True)
    if coach.tagline:
        pdf.set_font("Helvetica", size=9)
        pdf.cell(0, 5, coach.tagline[:200], ln=True)
        pdf.set_font("Helvetica", size=11)
    pdf.ln(4)
    pdf.cell(0, 8, f"Bill to: {client_name}", ln=True)
    ref = invoice.reference or f"#{invoice.id}"
    pdf.cell(0, 8, f"Reference: {ref}", ln=True)
    if invoice.amount is not None:
        pdf.cell(0, 8, f"Amount: {invoice.amount} {invoice.currency}", ln=True)
    if invoice.due_date:
        pdf.cell(0, 8, f"Due: {invoice.due_date.isoformat()}", ln=True)
    pdf.cell(0, 8, f"Status: {invoice.status}", ln=True)
    if invoice.invoice_period_start and invoice.invoice_period_end:
        pdf.cell(
            0,
            8,
            f"Period: {invoice.invoice_period_start.isoformat()} – {invoice.invoice_period_end.isoformat()}",
            ln=True,
        )
    if invoice.notes:
        pdf.ln(4)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 8, "Notes", ln=True)
        pdf.set_font("Helvetica", size=10)
        for line in invoice.notes.splitlines()[:40]:
            pdf.multi_cell(0, 5, line[:500])

    out = BytesIO()
    pdf.output(out)
    return out.getvalue()
