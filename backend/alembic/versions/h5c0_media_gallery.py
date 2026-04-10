"""media_assets and exercise_media

Revision ID: h5c0_media_gallery
Revises: g4b0_workout_builder
Create Date: 2026-04-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "h5c0_media_gallery"
down_revision: Union[str, None] = "g4b0_workout_builder"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "media_assets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("coach_id", sa.Integer(), nullable=False),
        sa.Column("storage_provider", sa.String(length=32), nullable=False),
        sa.Column("storage_path", sa.String(length=512), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["coach_id"], ["coaches.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_media_assets_coach_id"), "media_assets", ["coach_id"], unique=False)

    op.create_table(
        "exercise_media",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("media_asset_id", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["media_asset_id"], ["media_assets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("exercise_id", "media_asset_id", name="uq_exercise_media_asset"),
    )
    op.create_index(op.f("ix_exercise_media_exercise_id"), "exercise_media", ["exercise_id"], unique=False)
    op.create_index(op.f("ix_exercise_media_media_asset_id"), "exercise_media", ["media_asset_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_exercise_media_media_asset_id"), table_name="exercise_media")
    op.drop_index(op.f("ix_exercise_media_exercise_id"), table_name="exercise_media")
    op.drop_table("exercise_media")
    op.drop_index(op.f("ix_media_assets_coach_id"), table_name="media_assets")
    op.drop_table("media_assets")
