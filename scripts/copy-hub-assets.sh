#!/usr/bin/env bash
# Sync Hub HTML template assets into frontend/public/hub (gitignored — ThemeForest license).
# Run locally after extracting the purchased zip; do not commit the output.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${HUB_SRC:-$ROOT/.vendor/hub-html/hub-html/assets}"
DEST="$ROOT/frontend/public/hub/assets"

if [[ ! -d "$SRC" ]]; then
  echo "Hub assets not found at: $SRC" >&2
  echo "Extract themeforest Hub zip to .vendor/hub-html/ or set HUB_SRC." >&2
  exit 1
fi

mkdir -p "$DEST"
rsync -a --delete "$SRC/" "$DEST/"
echo "Hub assets synced to $DEST ($(du -sh "$DEST" | cut -f1))"
