"""plan_templates: image, prices, currency, code, sort_order; subscription starts_at patch

Revision ID: e1f0_plan_template_fields
Revises: c4d0_goal_types_catalog
Create Date: 2026-04-10

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e1f0_plan_template_fields"
down_revision: Union[str, None] = "c4d0_goal_types_catalog"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("plan_templates", sa.Column("image_url", sa.String(length=2048), nullable=True))
    op.add_column(
        "plan_templates",
        sa.Column("discount_price", sa.Numeric(precision=12, scale=2), nullable=True),
    )
    op.add_column(
        "plan_templates",
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="USD"),
    )
    op.add_column("plan_templates", sa.Column("code", sa.String(length=64), nullable=True))
    op.add_column(
        "plan_templates",
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_plan_templates_coach_code", "plan_templates", ["coach_id", "code"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_plan_templates_coach_code"), table_name="plan_templates")
    op.drop_column("plan_templates", "sort_order")
    op.drop_column("plan_templates", "code")
    op.drop_column("plan_templates", "currency")
    op.drop_column("plan_templates", "discount_price")
    op.drop_column("plan_templates", "image_url")
