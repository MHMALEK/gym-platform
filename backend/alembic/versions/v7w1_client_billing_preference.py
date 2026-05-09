"""client billing_preference (coach tracking only)

Revision ID: v7w1_client_billing_preference
Revises: u6v0_exercise_seed_metadata
Create Date: 2026-05-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "v7w1_client_billing_preference"
down_revision: Union[str, None] = "u6v0_exercise_seed_metadata"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "clients",
        sa.Column("billing_preference", sa.String(length=32), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("clients", "billing_preference")
