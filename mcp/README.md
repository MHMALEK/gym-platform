# Gym Coach MCP server

Stdio [Model Context Protocol](https://modelcontextprotocol.io) server for coaches. Tools are **loaded dynamically** from the FastAPI backend (`GET /api/v1/mcp/tools`), so the MCP package stays in sync with the same tool layer used by the in-app Assistant.

## What you get

| Tool category | Examples |
|---------------|----------|
| **Read** (same as in-app AI) | `get_dashboard_snapshot`, `list_clients`, `get_client`, `search_exercises`, `list_invoices`, `get_training_plan`, … |
| **Write** (MCP / agents only) | `create_client`, `update_client`, `create_invoice`, `update_invoice`, `create_flat_training_plan` |
| **AI** | `coach_assistant` — natural-language questions using server-side OpenAI + the read tools |

Write tools are marked `[WRITES DATA]` in their description. The in-app Assistant stays read-only for safety; MCP agents can mutate data when the coach approves.

## Setup

### 1. API key

In the web app: **Settings → Integrations → Generate key** (or `POST /api/v1/me/api-keys` with Firebase login).

Export the key (shown once):

```bash
export GYM_COACH_API_KEY="gck_…"
export GYM_COACH_API_BASE_URL="http://127.0.0.1:8000"
```

**Local dev without keys:** backend `DEV_BYPASS_AUTH=true`, then either `GYM_COACH_DEV_NO_AUTH=true` or `GYM_COACH_API_KEY=dev`.

### 2. Backend

Ensure `OPENAI_API_KEY` is set if you use `coach_assistant`.

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Run MCP

```bash
cd mcp
npm install
npm start
```

### 4. Cursor / Claude Desktop

```json
{
  "mcpServers": {
    "gym-coach": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/gym-coach-platform/mcp/src/index.ts"],
      "env": {
        "GYM_COACH_API_BASE_URL": "http://127.0.0.1:8000",
        "GYM_COACH_API_KEY": "gck_…"
      }
    }
  }
}
```

## Architecture

```
Cursor / Claude Desktop
        │ stdio MCP
        ▼
   mcp/src/index.ts  ──HTTP──►  FastAPI /api/v1/mcp/tools
        │                              │
        │                              ├── invoke_coach_tool (DB)
        └── coach_assistant ──────────► POST /mcp/assistant/chat
                                              └── OpenAI + tools
```

- **Single source of truth:** `backend/app/services/coach_tool_registry.py`
- **Coach scoping:** every call uses `X-API-Key` → your coach row
- **No duplicated business logic** in TypeScript — MCP only registers tools and proxies

## Example prompts (in Cursor)

- “How many overdue invoices do I have?” → `coach_assistant` or `get_dashboard_snapshot`
- “Create a client named Sara with email sara@example.com” → `create_client`
- “List pending invoices and summarize who owes the most” → `coach_assistant`
- “Find hamstring exercises with dumbbells” → `search_exercises`

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `GYM_COACH_API_KEY` | Yes* | Coach API key (`gck_…`) |
| `GYM_COACH_API_BASE_URL` | No | Default `http://127.0.0.1:8000` |
| `GYM_COACH_DEV_NO_AUTH` | No | Skip key when backend dev bypass is on |

\* Not required when `GYM_COACH_DEV_NO_AUTH=true` and backend `DEV_BYPASS_AUTH=true`.
