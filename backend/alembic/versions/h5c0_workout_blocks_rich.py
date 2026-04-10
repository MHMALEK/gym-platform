"""workout blocks (superset etc), rich HTML on plans and coaching

Revision ID: h5c0_blocks_rich
Revises: g4b0_workout_builder
Create Date: 2026-04-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "h5c0_blocks_rich"
down_revision: Union[str, None] = "g4b0_workout_builder"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "training_plan_items",
        sa.Column("block_id", sa.String(length=40), nullable=True),
    )
    op.add_column(
        "training_plan_items",
        sa.Column("block_type", sa.String(length=24), nullable=True),
    )
    op.add_column("training_plans", sa.Column("workout_rich_html", sa.Text(), nullable=True))
    op.add_column("client_coaching_plans", sa.Column("workout_rich_html", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("client_coaching_plans", "workout_rich_html")
    op.drop_column("training_plans", "workout_rich_html")
    op.drop_column("training_plan_items", "block_type")
    op.drop_column("training_plan_items", "block_id")
