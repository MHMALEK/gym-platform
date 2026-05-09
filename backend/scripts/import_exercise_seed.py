from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.database import AsyncSessionLocal
from app.services.exercise_seed_import import (
    DEFAULT_EXTERNAL_SOURCE,
    DEFAULT_LICENSE_STATUS,
    DEFAULT_SOURCE_URL,
    import_exercise_seed,
    load_seed_payload_from_text,
    load_seed_payload_from_url,
)


async def main() -> None:
    parser = argparse.ArgumentParser(description="Import platform exercise seed data.")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--path", help="Path to a JSON or Cursor-upload markdown seed file.")
    source.add_argument("--url", help="URL returning the seed JSON payload.")
    parser.add_argument("--external-source", default=DEFAULT_EXTERNAL_SOURCE)
    parser.add_argument("--source-url", default=DEFAULT_SOURCE_URL)
    parser.add_argument("--license-status", default=DEFAULT_LICENSE_STATUS)
    args = parser.parse_args()

    if args.path:
        rows = load_seed_payload_from_text(Path(args.path).read_text(encoding="utf-8"))
    else:
        rows = load_seed_payload_from_url(args.url)

    async with AsyncSessionLocal() as db:
        result = await import_exercise_seed(
            db,
            rows,
            external_source=args.external_source,
            source_url=args.source_url,
            license_status=args.license_status,
        )
    print(
        f"Imported exercise seed: created={result.created} "
        f"updated={result.updated} skipped={result.skipped}"
    )


if __name__ == "__main__":
    asyncio.run(main())
