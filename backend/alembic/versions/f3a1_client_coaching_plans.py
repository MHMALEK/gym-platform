"""client_coaching_plans: workout + diet text per client

Revision ID: f3a1_client_coaching_plans
Revises: e1f0_plan_template_fields
Create Date: 2026-04-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "f3a1_client_coaching_plans"
down_revision: Union[str, None] = "e1f0_plan_template_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "client_coaching_plans",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("workout_plan", sa.Text(), nullable=True),
        sa.Column("diet_plan", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("client_id", name="uq_client_coaching_plans_client_id"),
    )


def downgrade() -> None:
    op.drop_table("client_coaching_plans")
