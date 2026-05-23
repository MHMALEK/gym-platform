#!/usr/bin/env bash
# Run backend + frontend together (dev or local prod-style).
# Usage: ./run.sh dev | prod | help
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
BE_DIR="$ROOT/backend"
FE_DIR="$ROOT/frontend"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FE_DEV_PORT="${FE_DEV_PORT:-5173}"
FE_PREVIEW_PORT="${FE_PREVIEW_PORT:-4173}"

BE_PID=""
FE_PID=""

usage() {
  cat <<EOF
Usage: $(basename "$0") <dev|prod|help>

  dev   — FastAPI with --reload + Vite dev server (proxy /api → backend).
  prod  — FastAPI without reload + \`npm run build\` + Vite preview (same proxy).

Environment (optional):
  BACKEND_PORT    default 8000
  FE_DEV_PORT     default 5173
  FE_PREVIEW_PORT default 4173
  SKIP_FE_BUILD=1  (prod only) skip \`npm run build\` if dist is already fresh

Open after start:
  dev:  http://127.0.0.1:${FE_DEV_PORT}   (API proxied from same origin)
  prod: http://127.0.0.1:${FE_PREVIEW_PORT} (API proxied from same origin)
  API:  http://127.0.0.1:${BACKEND_PORT}/docs
EOF
}

cleanup() {
  if [[ -n "${BE_PID:-}" ]]; then kill "${BE_PID}" 2>/dev/null || true; fi
  if [[ -n "${FE_PID:-}" ]]; then kill "${FE_PID}" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

activate_backend() {
  if [[ -f "$BE_DIR/.venv/bin/activate" ]]; then
    # shellcheck source=/dev/null
    source "$BE_DIR/.venv/bin/activate"
  else
    echo "Warning: $BE_DIR/.venv not found. Using system python; create venv if imports fail." >&2
  fi
}

run_dev() {
  activate_backend
  (
    cd "$BE_DIR"
    exec uvicorn app.main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT"
  ) &
  BE_PID=$!

  (
    cd "$FE_DIR"
    exec npm run dev -- --port "$FE_DEV_PORT"
  ) &
  FE_PID=$!

  echo "Dev: frontend http://127.0.0.1:${FE_DEV_PORT}  |  API http://127.0.0.1:${BACKEND_PORT}/docs"
  wait "${BE_PID}" "${FE_PID}"
}

run_prod() {
  activate_backend
  if [[ "${SKIP_FE_BUILD:-0}" != "1" ]]; then
    (cd "$FE_DIR" && npm run build)
  else
    echo "Skipping frontend build (SKIP_FE_BUILD=1)."
  fi

  (
    cd "$BE_DIR"
    exec uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT"
  ) &
  BE_PID=$!

  (
    cd "$FE_DIR"
    exec npm run preview -- --host 127.0.0.1 --port "$FE_PREVIEW_PORT"
  ) &
  FE_PID=$!

  echo "Prod-style: frontend http://127.0.0.1:${FE_PREVIEW_PORT}  |  API http://127.0.0.1:${BACKEND_PORT}/docs"
  wait "${BE_PID}" "${FE_PID}"
}

MODE="${1:-}"
case "$MODE" in
  dev) run_dev ;;
  prod) run_prod ;;
  help | -h | --help | "") usage ;;
  *)
    echo "Unknown mode: $MODE" >&2
    usage >&2
    exit 1
    ;;
esac
