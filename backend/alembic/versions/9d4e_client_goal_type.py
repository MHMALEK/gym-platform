"""add client goal_type preset alongside goal description

Revision ID: 9d4e_client_goal_type
Revises: 8c3d_client_profile
Create Date: 2026-04-10

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9d4e_client_goal_type"
down_revision: Union[str, None] = "8c3d_client_profile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("clients", sa.Column("goal_type", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("clients", "goal_type")
