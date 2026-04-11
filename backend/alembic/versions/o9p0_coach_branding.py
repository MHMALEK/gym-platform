"""coaches: tagline, primary_color, logo_media_asset_id

Revision ID: o9p0
Revises: n8k0_training_plan_item_exercise_sets
Create Date: 2026-04-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "o9p0_coach_branding"
down_revision: Union[str, None] = "n8k0_training_plan_item_exercise_sets"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("coaches", sa.Column("tagline", sa.String(length=500), nullable=True))
    op.add_column("coaches", sa.Column("primary_color", sa.String(length=16), nullable=True))
    op.add_column("coaches", sa.Column("logo_media_asset_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_coaches_logo_media_asset_id",
        "coaches",
        "media_assets",
        ["logo_media_asset_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_coaches_logo_media_asset_id", "coaches", ["logo_media_asset_id"])


def downgrade() -> None:
    op.drop_index("ix_coaches_logo_media_asset_id", table_name="coaches")
    op.drop_constraint("fk_coaches_logo_media_asset_id", "coaches", type_="foreignkey")
    op.drop_column("coaches", "logo_media_asset_id")
    op.drop_column("coaches", "primary_color")
    op.drop_column("coaches", "tagline")
