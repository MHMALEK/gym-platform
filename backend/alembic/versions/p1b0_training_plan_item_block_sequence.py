"""training_plan_items.block_sequence for block member order (APIs / client apps)

Revision ID: p1b0_block_sequence
Revises: m9n0_nutrition_templates
Create Date: 2026-04-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "p1b0_block_sequence"
down_revision: Union[str, None] = "m9n0_nutrition_templates"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "training_plan_items",
        sa.Column("block_sequence", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("training_plan_items", "block_sequence")
