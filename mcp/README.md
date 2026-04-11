# Gym Coach MCP server

stdio-based [Model Context Protocol](https://modelcontextprotocol.io) server that calls your Gym Coach FastAPI with a **coach API key**.

## Prerequisites

1. Backend running (e.g. `uvicorn` on `http://127.0.0.1:8000`).
2. A key created **from the web app** while logged in with Firebase: `POST /api/v1/me/api-keys` (or the UI when you add it). You cannot create keys using `X-API-Key` itself.
3. Set `API_KEY_PEPPER` / `api_key_pepper` in backend `.env` in production so keys are hashed consistently after restarts.

## Environment

| Variable | Description |
|----------|-------------|
| `GYM_COACH_API_BASE_URL` | API origin, default `http://127.0.0.1:8000` |
| `GYM_COACH_API_KEY` | Plaintext key starting with `gck_` (from `POST /api/v1/me/api-keys`) |
| `GYM_COACH_DEV_NO_AUTH` | If `true`, omit `X-API-Key` (requires backend `DEV_BYPASS_AUTH=true` and a bootstrapped dev coach) |

**Local test without API keys:** set `DEV_BYPASS_AUTH=true` in the backend `.env`, run `POST /api/v1/auth/bootstrap` once, then start MCP with `GYM_COACH_DEV_NO_AUTH=true` and no `GYM_COACH_API_KEY`. Alternatively keep `DEV_BYPASS_AUTH=true` and set `GYM_COACH_API_KEY=dev` (backend accepts aliases `dev`, `test`, `bypass` per `DEV_MCP_API_KEY_ALIASES`).

## Run

```bash
cd mcp
npm install
export GYM_COACH_API_KEY='gck_...'   # or: GYM_COACH_DEV_NO_AUTH=true
npm start
```

## Tools (MVP)

- `create_flat_training_plan` — `POST /training-plans` then `PUT .../items` (flat `legacy_line` rows only; sets/reps supported).
- `list_clients` — `GET /clients`
- `create_client` — `POST /clients`
- `list_invoices` — `GET /invoices` with filters
- `search_exercises` — `GET /exercises?q=`

## Cursor / Claude Desktop

Add an MCP server entry pointing at `node` with args `path/to/mcp/node_modules/tsx/dist/cli.mjs` and `path/to/mcp/src/index.ts`, or run `npm start` under stdio with the env vars above. Exact UI depends on your client version.
