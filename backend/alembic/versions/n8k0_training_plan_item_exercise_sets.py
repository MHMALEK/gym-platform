"""training_plan_items: row_type + exercise_instance_id (exercise head vs sets)

Revision ID: n8k0
Revises: p1b0_block_sequence
Create Date: 2026-04-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "n8k0_training_plan_item_exercise_sets"
down_revision: Union[str, None] = "p1b0_block_sequence"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "training_plan_items",
        sa.Column(
            "row_type",
            sa.String(length=24),
            nullable=False,
            server_default="legacy_line",
        ),
    )
    op.add_column(
        "training_plan_items",
        sa.Column("exercise_instance_id", sa.String(length=40), nullable=True),
    )
    op.create_index(
        "ix_training_plan_items_plan_instance",
        "training_plan_items",
        ["training_plan_id", "exercise_instance_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_training_plan_items_plan_instance", table_name="training_plan_items")
    op.drop_column("training_plan_items", "exercise_instance_id")
    op.drop_column("training_plan_items", "row_type")
