from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.services.demo_seed import ensure_dev_coach, reset_coach_demo_data, seed_coach_demo_data


async def main() -> None:
    parser = argparse.ArgumentParser(description="Reset and/or seed demo data for the dev coach.")
    parser.add_argument(
        "--reset-only",
        action="store_true",
        help="Clear coach business data without re-seeding.",
    )
    args = parser.parse_args()

    if not settings.dev_bypass_auth:
        print("Warning: DEV_BYPASS_AUTH is not true — demo seed is intended for local dev only.")

    async with AsyncSessionLocal() as db:
        coach = await ensure_dev_coach(db)
        await db.commit()
        await db.refresh(coach)

        if args.reset_only:
            await reset_coach_demo_data(db, coach.id)
            await db.commit()
            print(f"Reset demo data for coach id={coach.id} ({coach.name}).")
            return

        summary = await seed_coach_demo_data(db, coach)
        print("Demo workspace ready:")
        print(f"  Coach: {coach.name} (id={summary.coach_id})")
        print(f"  Invite code: {summary.invite_code}")
        print(f"  Clients: {summary.clients}")
        print(f"  Training plans: {summary.training_plans}")
        print(f"  Nutrition templates: {summary.nutrition_templates}")
        print(f"  Membership products: {summary.plan_templates}")
        print(f"  Invoices: {summary.invoices}")
        print(f"  Chat messages: {summary.messages}")
        print(f"  Workout sessions: {summary.workout_sessions}")
        print("\nDev client login: Bearer dev-client (after coach bootstrap)")


if __name__ == "__main__":
    asyncio.run(main())
