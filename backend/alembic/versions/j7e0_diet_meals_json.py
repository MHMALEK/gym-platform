"""client_coaching_plans.diet_meals_json structured nutrition meals

Revision ID: j7e0_diet_meals
Revises: i6d0_muscle_groups
Create Date: 2026-04-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "j7e0_diet_meals"
down_revision: Union[str, None] = "i6d0_muscle_groups"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "client_coaching_plans",
        sa.Column("diet_meals_json", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("client_coaching_plans", "diet_meals_json")
