"""invoice finance: subscription link, period, paid_at, notes split, payment placeholders, sequences

Revision ID: r3b0_invoice_finance_extensions
Revises: q2a0_coaching_assigned_refs
Create Date: 2026-04-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "r3b0_invoice_finance_extensions"
down_revision: Union[str, None] = "q2a0_coaching_assigned_refs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "coach_invoice_sequences",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("coach_id", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("last_number", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["coach_id"], ["coaches.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("coach_id", "year", name="uq_coach_invoice_sequences_coach_year"),
    )
    op.create_index(op.f("ix_coach_invoice_sequences_coach_id"), "coach_invoice_sequences", ["coach_id"], unique=False)

    # SQLite: one add per batch_alter_table avoids CircularDependencyError in SQLAlchemy batch mode.
    cols = [
        sa.Column("subscription_id", sa.Integer(), nullable=True),
        sa.Column("invoice_period_start", sa.Date(), nullable=True),
        sa.Column("invoice_period_end", sa.Date(), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("internal_notes", sa.Text(), nullable=True),
        sa.Column("payment_provider", sa.String(length=64), nullable=True),
        sa.Column("external_payment_id", sa.String(length=255), nullable=True),
    ]
    for col in cols:
        with op.batch_alter_table("invoices", schema=None) as batch_op:
            batch_op.add_column(col)

    with op.batch_alter_table("invoices", schema=None) as batch_op:
        batch_op.create_foreign_key(
            "fk_invoices_subscription_id",
            "client_subscriptions",
            ["subscription_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index(batch_op.f("ix_invoices_subscription_id"), ["subscription_id"], unique=False)

    op.create_index(
        "ix_invoices_subscription_period",
        "invoices",
        ["subscription_id", "invoice_period_start", "invoice_period_end"],
        unique=True,
        sqlite_where=sa.text("subscription_id IS NOT NULL"),
        postgresql_where=sa.text("subscription_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_invoices_subscription_period", table_name="invoices")
    with op.batch_alter_table("invoices", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_invoices_subscription_id"))
        batch_op.drop_constraint("fk_invoices_subscription_id", type_="foreignkey")
    for name in (
        "external_payment_id",
        "payment_provider",
        "internal_notes",
        "paid_at",
        "invoice_period_end",
        "invoice_period_start",
        "subscription_id",
    ):
        with op.batch_alter_table("invoices", schema=None) as batch_op:
            batch_op.drop_column(name)
    op.drop_index(op.f("ix_coach_invoice_sequences_coach_id"), table_name="coach_invoice_sequences")
    op.drop_table("coach_invoice_sequences")
