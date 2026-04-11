"""client_coaching_plans: assigned_training_plan_id, assigned_nutrition_template_id

Revision ID: q2a0_coaching_assigned_refs
Revises: o9p0_coach_branding
Create Date: 2026-04-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "q2a0_coaching_assigned_refs"
down_revision: Union[str, None] = "o9p0_coach_branding"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "client_coaching_plans",
        sa.Column("assigned_training_plan_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "client_coaching_plans",
        sa.Column("assigned_nutrition_template_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_client_coaching_plans_assigned_training_plan_id",
        "client_coaching_plans",
        "training_plans",
        ["assigned_training_plan_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_client_coaching_plans_assigned_nutrition_template_id",
        "client_coaching_plans",
        "nutrition_templates",
        ["assigned_nutrition_template_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_client_coaching_plans_assigned_nutrition_template_id",
        "client_coaching_plans",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_client_coaching_plans_assigned_training_plan_id",
        "client_coaching_plans",
        type_="foreignkey",
    )
    op.drop_column("client_coaching_plans", "assigned_nutrition_template_id")
    op.drop_column("client_coaching_plans", "assigned_training_plan_id")
