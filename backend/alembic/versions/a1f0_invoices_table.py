"""invoices table; migrate snapshot fields off clients

Revision ID: a1f0_invoices_table
Revises: 9d4e_client_goal_type
Create Date: 2026-04-10

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1f0_invoices_table"
down_revision: Union[str, None] = "9d4e_client_goal_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "invoices",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("reference", sa.String(length=128), nullable=True),
        sa.Column("amount", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_invoices_client_id"), "invoices", ["client_id"], unique=False)
    op.create_index(op.f("ix_invoices_status"), "invoices", ["status"], unique=False)

    conn = op.get_bind()
    conn.execute(
        sa.text("""
            INSERT INTO invoices (
                client_id, reference, amount, currency, due_date, status, notes, created_at, updated_at
            )
            SELECT
                id,
                active_invoice_reference,
                active_invoice_amount,
                COALESCE(NULLIF(TRIM(COALESCE(active_invoice_currency, '')), ''), 'USD'),
                active_invoice_due_date,
                COALESCE(NULLIF(TRIM(COALESCE(active_invoice_status, '')), ''), 'pending'),
                NULL,
                created_at,
                updated_at
            FROM clients
            WHERE
                active_invoice_reference IS NOT NULL
                OR active_invoice_amount IS NOT NULL
                OR active_invoice_due_date IS NOT NULL
                OR (active_invoice_status IS NOT NULL AND TRIM(active_invoice_status) != '')
        """)
    )

    op.drop_column("clients", "active_invoice_status")
    op.drop_column("clients", "active_invoice_due_date")
    op.drop_column("clients", "active_invoice_currency")
    op.drop_column("clients", "active_invoice_amount")
    op.drop_column("clients", "active_invoice_reference")


def downgrade() -> None:
    op.add_column(
        "clients",
        sa.Column("active_invoice_reference", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "clients",
        sa.Column("active_invoice_amount", sa.Numeric(precision=10, scale=2), nullable=True),
    )
    op.add_column(
        "clients",
        sa.Column("active_invoice_currency", sa.String(length=8), nullable=True),
    )
    op.add_column("clients", sa.Column("active_invoice_due_date", sa.Date(), nullable=True))
    op.add_column(
        "clients",
        sa.Column("active_invoice_status", sa.String(length=32), nullable=True),
    )

    conn = op.get_bind()
    conn.execute(
        sa.text("""
            UPDATE clients SET
                active_invoice_reference = (
                    SELECT i.reference FROM invoices i
                    WHERE i.client_id = clients.id
                    ORDER BY i.created_at DESC LIMIT 1
                ),
                active_invoice_amount = (
                    SELECT i.amount FROM invoices i
                    WHERE i.client_id = clients.id
                    ORDER BY i.created_at DESC LIMIT 1
                ),
                active_invoice_currency = (
                    SELECT i.currency FROM invoices i
                    WHERE i.client_id = clients.id
                    ORDER BY i.created_at DESC LIMIT 1
                ),
                active_invoice_due_date = (
                    SELECT i.due_date FROM invoices i
                    WHERE i.client_id = clients.id
                    ORDER BY i.created_at DESC LIMIT 1
                ),
                active_invoice_status = (
                    SELECT i.status FROM invoices i
                    WHERE i.client_id = clients.id
                    ORDER BY i.created_at DESC LIMIT 1
                )
            WHERE EXISTS (SELECT 1 FROM invoices i WHERE i.client_id = clients.id)
        """)
    )

    op.drop_index(op.f("ix_invoices_status"), table_name="invoices")
    op.drop_index(op.f("ix_invoices_client_id"), table_name="invoices")
    op.drop_table("invoices")
