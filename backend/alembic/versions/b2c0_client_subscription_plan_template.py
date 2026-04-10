"""client subscription type from coach plan template (FK)

Revision ID: b2c0_subscription_plan_template
Revises: a1f0_invoices_table
Create Date: 2026-04-10

SQLite: use batch mode for FK + drop column.

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2c0_subscription_plan_template"
down_revision: Union[str, None] = "a1f0_invoices_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("clients") as batch:
        batch.add_column(sa.Column("subscription_plan_template_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_clients_subscription_plan_template_id",
            "plan_templates",
            ["subscription_plan_template_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch.create_index(
            "ix_clients_subscription_plan_template_id",
            ["subscription_plan_template_id"],
            unique=False,
        )
        batch.drop_column("subscription_type_override")


def downgrade() -> None:
    with op.batch_alter_table("clients") as batch:
        batch.add_column(
            sa.Column("subscription_type_override", sa.String(length=128), nullable=True),
        )
        batch.drop_constraint("fk_clients_subscription_plan_template_id", type_="foreignkey")
        batch.drop_index("ix_clients_subscription_plan_template_id")
        batch.drop_column("subscription_plan_template_id")
