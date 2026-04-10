"""exercise venue + cues, plan venue, client workout_items JSON

Revision ID: g4b0_workout_builder
Revises: f3a1_client_coaching_plans
Create Date: 2026-04-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "g4b0_workout_builder"
down_revision: Union[str, None] = "f3a1_client_coaching_plans"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "exercises",
        sa.Column("venue_type", sa.String(length=32), nullable=False, server_default="both"),
    )
    op.add_column("exercises", sa.Column("tips", sa.Text(), nullable=True))
    op.add_column("exercises", sa.Column("common_mistakes", sa.Text(), nullable=True))
    op.add_column("exercises", sa.Column("correct_form_cues", sa.Text(), nullable=True))
    op.add_column("exercises", sa.Column("demo_media_url", sa.String(length=512), nullable=True))
    op.add_column("exercises", sa.Column("thumbnail_url", sa.String(length=512), nullable=True))
    op.add_column(
        "training_plans",
        sa.Column("venue_type", sa.String(length=32), nullable=False, server_default="mixed"),
    )
    op.add_column("client_coaching_plans", sa.Column("workout_items_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("client_coaching_plans", "workout_items_json")
    op.drop_column("training_plans", "venue_type")
    op.drop_column("exercises", "thumbnail_url")
    op.drop_column("exercises", "demo_media_url")
    op.drop_column("exercises", "correct_form_cues")
    op.drop_column("exercises", "common_mistakes")
    op.drop_column("exercises", "tips")
    op.drop_column("exercises", "venue_type")
