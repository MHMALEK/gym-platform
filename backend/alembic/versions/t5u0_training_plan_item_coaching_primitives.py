"""training_plan_items: add weight_kg / rpe / tempo coaching primitives

Revision ID: t5u0_training_plan_item_coaching_primitives
Revises: s4t0_coach_api_keys
Create Date: 2026-05-09

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "t5u0_training_plan_item_coaching_primitives"
down_revision: Union[str, None] = "s4t0_coach_api_keys"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "training_plan_items",
        sa.Column("weight_kg", sa.Float(), nullable=True),
    )
    op.add_column(
        "training_plan_items",
        sa.Column("rpe", sa.Float(), nullable=True),
    )
    op.add_column(
        "training_plan_items",
        sa.Column("tempo", sa.String(length=16), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("training_plan_items", "tempo")
    op.drop_column("training_plan_items", "rpe")
    op.drop_column("training_plan_items", "weight_kg")
