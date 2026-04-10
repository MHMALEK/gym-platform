"""client profile: metrics, goal, subscription override, invoice snapshot

Revision ID: 8c3d_client_profile
Revises: 7a2b_seed_catalog
Create Date: 2026-04-10

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8c3d_client_profile"
down_revision: Union[str, None] = "7a2b_seed_catalog"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("clients", sa.Column("weight_kg", sa.Numeric(5, 2), nullable=True))
    op.add_column("clients", sa.Column("height_cm", sa.Numeric(5, 2), nullable=True))
    op.add_column("clients", sa.Column("goal", sa.String(length=500), nullable=True))
    op.add_column(
        "clients",
        sa.Column("subscription_type_override", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "clients",
        sa.Column("active_invoice_reference", sa.String(length=128), nullable=True),
    )
    op.add_column("clients", sa.Column("active_invoice_amount", sa.Numeric(10, 2), nullable=True))
    op.add_column(
        "clients",
        sa.Column("active_invoice_currency", sa.String(length=8), nullable=True),
    )
    op.add_column("clients", sa.Column("active_invoice_due_date", sa.Date(), nullable=True))
    op.add_column(
        "clients",
        sa.Column("active_invoice_status", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "clients",
        sa.Column("account_status", sa.String(length=32), nullable=False, server_default="good_standing"),
    )


def downgrade() -> None:
    op.drop_column("clients", "account_status")
    op.drop_column("clients", "active_invoice_status")
    op.drop_column("clients", "active_invoice_due_date")
    op.drop_column("clients", "active_invoice_currency")
    op.drop_column("clients", "active_invoice_amount")
    op.drop_column("clients", "active_invoice_reference")
    op.drop_column("clients", "subscription_type_override")
    op.drop_column("clients", "goal")
    op.drop_column("clients", "height_cm")
    op.drop_column("clients", "weight_kg")
