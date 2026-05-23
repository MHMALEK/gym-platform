# Gym Coach Platform

All-in-one coaching platform: **coach dashboard** (web + mobile), **client portal** (web + mobile), and a **REST API** (FastAPI). Manage clients, membership products, custom exercises, training plans, nutrition templates, invoices, messaging, and client workout logging.

Auth is **Firebase** in production. Local development uses **dev bypass** (no Firebase required).

## What's included

| Surface | Path | Highlights |
|---------|------|------------|
| **Coach web** | `frontend/` | Clients, plans, invoices, messages, memberships, library catalog, dashboard, AI assistant, settings |
| **Client web** | `frontend/` → `/client/*` | Workout & nutrition plans, **training log**, invoices, messages, promotions, reminders |
| **Client mobile** | `client-mobile/` | Same client flows (Expo) — home, plans, log workout, history, invoices, messages |
| **Coach mobile** | `mobile/` | Clients & invoices on the go (basic; no workout builder) |
| **API** | `backend/` | OpenAPI at `/docs`, client portal API, MCP tool layer |
| **MCP server** | `mcp/` | Connect Cursor / Claude Desktop to coach data — see [`mcp/README.md`](mcp/README.md) |
| **Telegram bot** | `telegram-bot/` | Optional client/invoice bot — see [`telegram-bot/README.md`](telegram-bot/README.md) |

## Quick start (local demo)

See **[`DEMO.md`](DEMO.md)** for a full demo script, env checklist, and troubleshooting.

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # DEV_BYPASS_AUTH=true by default
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API base: `http://localhost:8000/api/v1`
- OpenAPI: `http://localhost:8000/docs`
- With `DEV_BYPASS_AUTH=true`, any non-empty `Authorization: Bearer <token>` maps to the dev coach (`dev`) or dev client (`dev-client`).

### 2. Coach + client web

```bash
cd frontend
npm install
npm run dev
```

- **Landing page:** `http://localhost:5173/`
- Coach desk: `http://localhost:5173/desk` (after sign-in)
- Client portal: `http://localhost:5173/client/login`

Vite proxies `/api` to `http://127.0.0.1:8000`. With `VITE_DEV_AUTH=true` (see `.env.development`), use **Continue (dev login)** on the coach login screen.

Set `VITE_API_URL` only when the API is on another origin (empty = same-origin + proxy).

### 3. Client mobile (optional)

```bash
cd client-mobile
cp .env.example .env
npm install
npm run start
```

Dev flow:

1. Coach dev login on web → **Settings → Branding** → copy **invite code**
2. Set `EXPO_PUBLIC_DEV_INVITE_CODE` in `client-mobile/.env` (or enter on login)
3. **Continue (dev client login)** — uses Bearer token `dev-client`

See [`client-mobile/README.md`](client-mobile/README.md) for simulator vs physical device API URLs.

### 4. Coach mobile (optional)

```bash
cd mobile
cp .env.example .env
npm install
npm run start
```

Basic clients and invoices only. Use **Continue (dev login)** when `EXPO_PUBLIC_DEV_AUTH=true`.

## Client portal features

Clients (web `/client/*` or `client-mobile/`) can:

- View assigned **workout** and **nutrition** plans
- **Log workouts** — mark sets/reps/weight from the assigned plan; browse **history**
- View and download **invoice PDFs**
- **Message** their coach (bidirectional chat)
- See **reminders** (e.g. overdue invoices) and **promotions** (discounted membership plans)

Training log API (client auth):

- `GET /client/training/log-template` — prefill from coaching plan
- `GET/POST/PATCH /client/training/sessions` — list, create, update sessions

## AI features (optional)

Requires `OPENAI_API_KEY` in `backend/.env`. OpenAI-compatible providers (e.g. **OpenRouter**) work via `OPENAI_BASE_URL` and `OPENAI_MODEL`.

| Feature | Where |
|---------|--------|
| Training plan AI draft | Training plan create/edit |
| Coach Assistant | `/assistant` (web) |
| Dashboard AI digest | Dashboard |
| MCP `coach_assistant` | [`mcp/README.md`](mcp/README.md) |

Without a key, AI endpoints return **503** — safe to skip in demos.

## Payments

Online/card payments are **not implemented** (`NoOpPaymentProvider`). Invoices support manual status updates and **PDF download**.

## Environment variables

| Component | File | Key settings |
|-----------|------|--------------|
| Backend | `backend/.env.example` | `DATABASE_URL`, `DEV_BYPASS_AUTH`, `CORS_ORIGINS`, `OPENAI_API_KEY` |
| Coach web | `frontend/.env.development` | `VITE_DEV_AUTH=true`, `VITE_API_URL` |
| Client mobile | `client-mobile/.env.example` | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_DEV_AUTH`, `EXPO_PUBLIC_DEV_INVITE_CODE` |
| Coach mobile | `mobile/.env.example` | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_DEV_AUTH` |
| MCP | `mcp/README.md` | `GYM_COACH_API_KEY`, `GYM_COACH_API_BASE_URL` |

## Firebase (production)

1. Create a Firebase project; enable **Authentication** (e.g. email/password).
2. Enable **Storage** and deploy rules: `firebase deploy --only storage` (uses [`firebase/storage.rules`](firebase/storage.rules)).
3. Download a **service account** JSON → set `FIREBASE_CREDENTIALS_PATH` on the API.
4. Copy [`frontend/.env.example`](frontend/.env.example) to production env. Set `VITE_DEV_AUTH=false`, fill `VITE_FIREBASE_*`, and set `VITE_FIREBASE_STORAGE_BUCKET`.
5. Set `DEV_BYPASS_AUTH=false` on the backend. Use Postgres (`DATABASE_URL=postgresql+asyncpg://…`).
6. Add your deployed frontend origin to `CORS_ORIGINS`.
7. Build and deploy the SPA: `cd frontend && npm run build` → host `frontend/dist` (e.g. Firebase Hosting).

## Project layout

```
backend/app/          FastAPI, SQLAlchemy models, routers under api/
frontend/src/         Refine coach app + client portal (/client/*)
client-mobile/        Expo client app (plans, training log, invoices, messages)
mobile/               Expo coach app (clients + invoices)
mcp/                  MCP stdio server for AI agents
telegram-bot/         Optional Telegram integration
```

## Catalog seed data

After `alembic upgrade head`, migrations seed:

- Exercise catalog (muscle groups, starter exercises)
- **Starter full body** training plan (copy from Library → Catalog training plans)
- Nutrition templates (copy from Library → Catalog nutrition templates)

Business data (clients, invoices, memberships) is **not** seeded by migrations — run **`python scripts/seed_demo.py`** or use **Settings → Branding → Load demo workspace** in dev mode.

## Docs index

- [`DEMO.md`](DEMO.md) — demo setup, scripted walkthrough, troubleshooting
- [`frontend/README.md`](frontend/README.md) — coach web + client portal dev notes
- [`client-mobile/README.md`](client-mobile/README.md) — Expo client app setup
- [`mcp/README.md`](mcp/README.md) — MCP server for Cursor / Claude Desktop
- [`telegram-bot/README.md`](telegram-bot/README.md) — Telegram bot MVP
