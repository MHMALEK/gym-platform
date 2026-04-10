"""platform goal_types catalog; clients.goal_type_id FK

Revision ID: c4d0_goal_types_catalog
Revises: b2c0_subscription_plan_template
Create Date: 2026-04-10

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4d0_goal_types_catalog"
down_revision: Union[str, None] = "b2c0_subscription_plan_template"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_GOAL_SEED = [
    ("lose_weight", "Lose weight", 10),
    ("gain_weight", "Gain weight", 20),
    ("build_muscle", "Build muscle", 30),
    ("improve_endurance", "Improve endurance", 40),
    ("general_fitness", "General fitness", 50),
    ("body_recomposition", "Body recomposition", 60),
    ("sport_performance", "Sport performance", 70),
    ("rehab_mobility", "Rehab / mobility", 80),
]


def upgrade() -> None:
    op.create_table(
        "goal_types",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=128), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_goal_types_code"), "goal_types", ["code"], unique=True)

    goal_t = sa.table(
        "goal_types",
        sa.column("code", sa.String(64)),
        sa.column("label", sa.String(128)),
        sa.column("sort_order", sa.Integer),
        sa.column("is_active", sa.Boolean),
    )
    op.bulk_insert(
        goal_t,
        [
            {"code": c, "label": lbl, "sort_order": so, "is_active": True}
            for c, lbl, so in _GOAL_SEED
        ],
    )

    with op.batch_alter_table("clients") as batch:
        batch.add_column(sa.Column("goal_type_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_clients_goal_type_id",
            "goal_types",
            ["goal_type_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch.create_index("ix_clients_goal_type_id", ["goal_type_id"], unique=False)

    op.execute(
        sa.text("""
            UPDATE clients
            SET goal_type_id = (
                SELECT goal_types.id FROM goal_types
                WHERE goal_types.code = clients.goal_type
            )
            WHERE clients.goal_type IS NOT NULL AND TRIM(clients.goal_type) != ''
        """)
    )

    with op.batch_alter_table("clients") as batch:
        batch.drop_column("goal_type")


def downgrade() -> None:
    with op.batch_alter_table("clients") as batch:
        batch.add_column(sa.Column("goal_type", sa.String(length=64), nullable=True))

    op.execute(
        sa.text("""
            UPDATE clients
            SET goal_type = (
                SELECT goal_types.code FROM goal_types
                WHERE goal_types.id = clients.goal_type_id
            )
            WHERE clients.goal_type_id IS NOT NULL
        """)
    )

    with op.batch_alter_table("clients") as batch:
        batch.drop_constraint("fk_clients_goal_type_id", type_="foreignkey")
        batch.drop_index("ix_clients_goal_type_id")
        batch.drop_column("goal_type_id")

    op.drop_index(op.f("ix_goal_types_code"), table_name="goal_types")
    op.drop_table("goal_types")
