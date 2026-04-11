"""client_coaching_plans: assigned_training_plan_id, assigned_nutrition_template_id

Revision ID: q2a0_coaching_assigned_refs
Revises: o9p0_coach_branding
Create Date: 2026-04-11

SQLite: use batch mode for FKs (ALTER constraints not supported on plain SQLite).

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "q2a0_coaching_assigned_refs"
down_revision: Union[str, None] = "o9p0_coach_branding"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("client_coaching_plans") as batch:
        batch.add_column(sa.Column("assigned_training_plan_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("assigned_nutrition_template_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_client_coaching_plans_assigned_training_plan_id",
            "training_plans",
            ["assigned_training_plan_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch.create_foreign_key(
            "fk_client_coaching_plans_assigned_nutrition_template_id",
            "nutrition_templates",
            ["assigned_nutrition_template_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    with op.batch_alter_table("client_coaching_plans") as batch:
        batch.drop_constraint(
            "fk_client_coaching_plans_assigned_nutrition_template_id",
            type_="foreignkey",
        )
        batch.drop_constraint(
            "fk_client_coaching_plans_assigned_training_plan_id",
            type_="foreignkey",
        )
        batch.drop_column("assigned_nutrition_template_id")
        batch.drop_column("assigned_training_plan_id")
