"""muscle_groups catalog + exercise_muscle_groups; drop exercises.muscle_groups text

Revision ID: i6d0_muscle_groups
Revises: h5c0_media_gallery
Create Date: 2026-04-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "i6d0_muscle_groups"
down_revision: Union[str, None] = "h5c0_media_gallery"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "muscle_groups",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=128), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_muscle_groups_code"), "muscle_groups", ["code"], unique=True)

    op.create_table(
        "exercise_muscle_groups",
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("muscle_group_id", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["muscle_group_id"], ["muscle_groups.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("exercise_id", "muscle_group_id"),
    )

    seed = [
        ("chest", "Chest", 10),
        ("upper_back", "Upper back", 20),
        ("lower_back", "Lower back", 30),
        ("lats", "Lats", 40),
        ("shoulders", "Shoulders", 50),
        ("traps", "Traps", 60),
        ("biceps", "Biceps", 70),
        ("triceps", "Triceps", 80),
        ("forearms", "Forearms", 90),
        ("core", "Core / abs", 100),
        ("obliques", "Obliques", 110),
        ("glutes", "Glutes", 120),
        ("quads", "Quadriceps", 130),
        ("hamstrings", "Hamstrings", 140),
        ("calves", "Calves", 150),
        ("hip_flexors", "Hip flexors", 160),
        ("adductors", "Adductors", 170),
        ("full_body", "Full body", 180),
        ("cardio", "Cardio", 190),
    ]
    groups_table = sa.table(
        "muscle_groups",
        sa.column("code", sa.String),
        sa.column("label", sa.String),
        sa.column("sort_order", sa.Integer),
        sa.column("is_active", sa.Boolean),
    )
    op.bulk_insert(
        groups_table,
        [
            {"code": c, "label": lab, "sort_order": so, "is_active": True}
            for c, lab, so in seed
        ],
    )

    op.drop_column("exercises", "muscle_groups")


def downgrade() -> None:
    op.add_column("exercises", sa.Column("muscle_groups", sa.Text(), nullable=True))
    op.drop_table("exercise_muscle_groups")
    op.drop_index(op.f("ix_muscle_groups_code"), table_name="muscle_groups")
    op.drop_table("muscle_groups")
