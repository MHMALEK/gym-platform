"""client_coaching_plans.program_venue for exercise picker filter

Revision ID: k8f0_coaching_program_venue
Revises: j7e0_diet_meals
Create Date: 2026-04-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "k8f0_coaching_program_venue"
down_revision: Union[str, None] = "j7e0_diet_meals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "client_coaching_plans",
        sa.Column(
            "program_venue",
            sa.String(length=32),
            nullable=False,
            server_default="mixed",
        ),
    )


def downgrade() -> None:
    op.drop_column("client_coaching_plans", "program_venue")
