"""nutrition_templates: catalog + coach-owned meal plan templates

Revision ID: m9n0_nutrition_templates
Revises: k8f0_coaching_program_venue
Create Date: 2026-04-10

"""

import json
from datetime import datetime
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "m9n0_nutrition_templates"
down_revision: Union[str, None] = "k8f0_coaching_program_venue"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "nutrition_templates",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("coach_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("notes_plan", sa.Text(), nullable=True),
        sa.Column("meals_json", sa.Text(), nullable=True),
        sa.Column("source_catalog_template_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["coach_id"], ["coaches.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_nutrition_templates_coach_id", "nutrition_templates", ["coach_id"], unique=False)

    now = datetime.utcnow()
    balanced = [
        {
            "sort_order": 0,
            "name": "Breakfast",
            "notes": None,
            "foods": [
                {
                    "description": "Oatmeal, berries, Greek yogurt",
                    "calories": 420,
                    "protein_g": 25,
                    "carbs_g": 55,
                    "fat_g": 12,
                }
            ],
        },
        {
            "sort_order": 1,
            "name": "Lunch",
            "notes": None,
            "foods": [
                {
                    "description": "Chicken breast, rice, mixed vegetables",
                    "calories": 580,
                    "protein_g": 45,
                    "carbs_g": 55,
                    "fat_g": 14,
                }
            ],
        },
        {
            "sort_order": 2,
            "name": "Dinner",
            "notes": None,
            "foods": [
                {
                    "description": "Salmon, sweet potato, salad with olive oil",
                    "calories": 520,
                    "protein_g": 38,
                    "carbs_g": 40,
                    "fat_g": 20,
                }
            ],
        },
    ]
    high_protein = [
        {
            "sort_order": 0,
            "name": "Breakfast",
            "notes": "Emphasize protein at each meal.",
            "foods": [
                {
                    "description": "Egg whites, whole eggs, whole-grain toast",
                    "calories": 380,
                    "protein_g": 32,
                    "carbs_g": 28,
                    "fat_g": 14,
                }
            ],
        },
        {
            "sort_order": 1,
            "name": "Lunch",
            "notes": None,
            "foods": [
                {
                    "description": "Lean beef or turkey, quinoa, broccoli",
                    "calories": 620,
                    "protein_g": 52,
                    "carbs_g": 45,
                    "fat_g": 18,
                }
            ],
        },
        {
            "sort_order": 2,
            "name": "Snack",
            "notes": None,
            "foods": [
                {
                    "description": "Cottage cheese or skyr, fruit",
                    "calories": 220,
                    "protein_g": 28,
                    "carbs_g": 18,
                    "fat_g": 4,
                }
            ],
        },
        {
            "sort_order": 3,
            "name": "Dinner",
            "notes": None,
            "foods": [
                {
                    "description": "White fish or chicken, potatoes, green beans",
                    "calories": 480,
                    "protein_g": 48,
                    "carbs_g": 38,
                    "fat_g": 10,
                }
            ],
        },
    ]
    light_day = [
        {
            "sort_order": 0,
            "name": "Breakfast",
            "notes": "Lighter portions; adjust to client needs.",
            "foods": [
                {
                    "description": "Protein shake, small banana",
                    "calories": 280,
                    "protein_g": 30,
                    "carbs_g": 28,
                    "fat_g": 6,
                }
            ],
        },
        {
            "sort_order": 1,
            "name": "Lunch",
            "notes": None,
            "foods": [
                {
                    "description": "Large salad with grilled chicken, light dressing",
                    "calories": 380,
                    "protein_g": 35,
                    "carbs_g": 22,
                    "fat_g": 14,
                }
            ],
        },
        {
            "sort_order": 2,
            "name": "Dinner",
            "notes": None,
            "foods": [
                {
                    "description": "Fish or tofu, steamed vegetables, small portion rice",
                    "calories": 360,
                    "protein_g": 32,
                    "carbs_g": 30,
                    "fat_g": 10,
                }
            ],
        },
    ]
    seeds = [
        {
            "name": "Balanced day (catalog)",
            "description": "Three meals with moderate protein and carbs — a solid default template.",
            "notes_plan": "Scale portions to the client's weight, activity, and goals. Encourage water through the day.",
            "meals_json": json.dumps(balanced),
        },
        {
            "name": "High protein day (catalog)",
            "description": "Four eating occasions with emphasis on protein for recovery and satiety.",
            "notes_plan": "Use as a starting point for strength-focused clients; tweak fats/carbs per preference.",
            "meals_json": json.dumps(high_protein),
        },
        {
            "name": "Light day (catalog)",
            "description": "Lower-calorie structure with three meals — useful as a deficit or rest-day outline.",
            "notes_plan": "Not medical advice; pair with appropriate coaching and client health context.",
            "meals_json": json.dumps(light_day),
        },
    ]
    conn = op.get_bind()
    for s in seeds:
        conn.execute(
            sa.text(
                """
                INSERT INTO nutrition_templates
                (coach_id, name, description, notes_plan, meals_json, source_catalog_template_id, created_at, updated_at)
                VALUES (NULL, :name, :description, :notes_plan, :meals_json, NULL, :created_at, :updated_at)
                """
            ),
            {**s, "created_at": now, "updated_at": now},
        )


def downgrade() -> None:
    op.drop_index("ix_nutrition_templates_coach_id", table_name="nutrition_templates")
    op.drop_table("nutrition_templates")
