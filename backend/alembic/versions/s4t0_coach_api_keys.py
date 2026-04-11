"""coach api keys for MCP / machine auth

Revision ID: s4t0_coach_api_keys
Revises: r3b0_invoice_finance_extensions
Create Date: 2026-04-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "s4t0_coach_api_keys"
down_revision: Union[str, None] = "r3b0_invoice_finance_extensions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "coach_api_keys",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("coach_id", sa.Integer(), nullable=False),
        sa.Column("key_prefix", sa.String(length=24), nullable=False),
        sa.Column("key_hash", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=128), nullable=True),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["coach_id"], ["coaches.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key_hash", name="uq_coach_api_keys_key_hash"),
    )
    op.create_index(op.f("ix_coach_api_keys_coach_id"), "coach_api_keys", ["coach_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_coach_api_keys_coach_id"), table_name="coach_api_keys")
    op.drop_table("coach_api_keys")
