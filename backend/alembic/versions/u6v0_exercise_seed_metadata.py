"""exercise seed metadata and tutorial links

Revision ID: u6v0_exercise_seed_metadata
Revises: t5u0_training_plan_item_coaching_primitives
Create Date: 2026-05-09

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "u6v0_exercise_seed_metadata"
down_revision: Union[str, None] = "t5u0_training_plan_item_coaching_primitives"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("exercises", sa.Column("external_source", sa.String(length=128), nullable=True))
    op.add_column("exercises", sa.Column("external_id", sa.String(length=128), nullable=True))
    op.add_column("exercises", sa.Column("difficulty", sa.String(length=32), nullable=True))
    op.add_column("exercises", sa.Column("exercise_type", sa.String(length=64), nullable=True))
    op.add_column("exercises", sa.Column("body_parts", sa.Text(), nullable=True))
    op.add_column("exercises", sa.Column("secondary_muscles", sa.Text(), nullable=True))
    op.add_column("exercises", sa.Column("instructions", sa.Text(), nullable=True))
    op.add_column("exercises", sa.Column("setup_notes", sa.Text(), nullable=True))
    op.add_column("exercises", sa.Column("safety_notes", sa.Text(), nullable=True))
    op.add_column("exercises", sa.Column("source_url", sa.String(length=512), nullable=True))
    op.add_column("exercises", sa.Column("license_status", sa.String(length=64), nullable=True))
    op.create_index(op.f("ix_exercises_external_source"), "exercises", ["external_source"], unique=False)
    op.create_index(op.f("ix_exercises_external_id"), "exercises", ["external_id"], unique=False)

    op.create_table(
        "exercise_video_links",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("url", sa.String(length=1024), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("exercise_id", "url", name="uq_exercise_video_link_url"),
    )
    op.create_index(
        op.f("ix_exercise_video_links_exercise_id"),
        "exercise_video_links",
        ["exercise_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_exercise_video_links_exercise_id"), table_name="exercise_video_links")
    op.drop_table("exercise_video_links")
    op.drop_index(op.f("ix_exercises_external_id"), table_name="exercises")
    op.drop_index(op.f("ix_exercises_external_source"), table_name="exercises")
    op.drop_column("exercises", "license_status")
    op.drop_column("exercises", "source_url")
    op.drop_column("exercises", "safety_notes")
    op.drop_column("exercises", "setup_notes")
    op.drop_column("exercises", "instructions")
    op.drop_column("exercises", "secondary_muscles")
    op.drop_column("exercises", "body_parts")
    op.drop_column("exercises", "exercise_type")
    op.drop_column("exercises", "difficulty")
    op.drop_column("exercises", "external_id")
    op.drop_column("exercises", "external_source")
