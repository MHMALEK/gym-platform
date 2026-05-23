"""coaches: public_slug, site_content, site_published

Revision ID: z1a2_coach_public_site
Revises: y0z1_client_workout_sessions
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "z1a2_coach_public_site"
down_revision: Union[str, None] = "y0z1_client_workout_sessions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("coaches", sa.Column("public_slug", sa.String(length=64), nullable=True))
    op.add_column("coaches", sa.Column("site_content", sa.Text(), nullable=True))
    op.add_column(
        "coaches",
        sa.Column("site_published", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index(op.f("ix_coaches_public_slug"), "coaches", ["public_slug"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_coaches_public_slug"), table_name="coaches")
    op.drop_column("coaches", "site_published")
    op.drop_column("coaches", "site_content")
    op.drop_column("coaches", "public_slug")
