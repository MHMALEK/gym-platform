# Demo guide

Use this guide to run a **15-minute local demo** of the gym coach platform: coach web (primary), client web or client mobile (secondary).

## Prerequisites

- Python 3.11+, Node 18+, npm
- Three terminals (backend, frontend, optional client mobile)

## One-time setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Confirm: `http://localhost:8000/docs` loads.

### Load demo data (recommended)

After coach dev login once (`POST /auth/bootstrap`), load a full demo workspace:

**CLI:**

```bash
cd backend
source .venv/bin/activate
python scripts/seed_demo.py
```

**API** (coach auth, `DEV_BYPASS_AUTH=true`):

```bash
curl -X POST http://127.0.0.1:8000/api/v1/demo/seed -H "Authorization: Bearer dev"
```

**Web UI:** Settings → Branding → **Load demo workspace** (dev mode only).

This creates:

- 3 clients (including dev client **Sara Demo** for `dev-client` login)
- Copied starter workout + nutrition plans, assigned to Sara
- Membership product with discount (promotions)
- Pending + overdue invoices (reminders)
- Coach/client chat messages
- One completed training log session

Reset without re-seeding: `python scripts/seed_demo.py --reset-only` or `POST /api/v1/demo/reset`.

### Frontend (coach + client web)

```bash
cd frontend
npm install
npm run dev
```

Confirm: `http://localhost:5173/login` shows **Continue (dev login)**.

### Client mobile (optional)

```bash
cd client-mobile
cp .env.example .env
npm install
npm run start
```

Set `EXPO_PUBLIC_API_URL` per target:

| Target | `EXPO_PUBLIC_API_URL` |
|--------|------------------------|
| iOS Simulator | `http://127.0.0.1:8000` |
| Android Emulator | `http://10.0.2.2:8000` |
| Physical device | `http://<your-lan-ip>:8000` (backend must use `--host 0.0.0.0`) |

## Env checklist

| Check | Variable / action |
|-------|-------------------|
| Backend dev auth | `DEV_BYPASS_AUTH=true` in `backend/.env` |
| Migrations applied | `alembic upgrade head` (includes `client_workout_sessions`) |
| Demo data loaded | `python scripts/seed_demo.py` or Settings → Branding → Load demo |
| Coach web dev auth | `VITE_DEV_AUTH=true` in `frontend/.env.development` |
| Client mobile dev auth | `EXPO_PUBLIC_DEV_AUTH=true` in `client-mobile/.env` |
| Client invite code | Copy from **Settings → Branding** after coach bootstrap |
| AI (optional) | `OPENAI_API_KEY` in `backend/.env` — skip AI steps if unset |

## Dev auth tokens

| Role | Token | Login |
|------|-------|-------|
| Coach (web/mobile) | `dev` | Continue (dev login) |
| Client (web/mobile) | `dev-client` | Client login + invite code on first signup |

**Important:** Log in as **coach first** so `POST /auth/bootstrap` creates the coach profile. Then copy the **invite code** from Settings → Branding before the first client login.

## Demo script (~15 min)

### Act 1 — Coach bootstraps (4 min)

1. Open `http://localhost:5173/login` → **Continue (dev login)**.
2. **Settings → Branding** → **Load demo workspace** (or run `python scripts/seed_demo.py` first).
3. Copy **invite code** from the same page (needed for first client mobile login).
4. Optional tweaks: branding colors, or add another client from **Clients → Create**.

Skip manual library copy / client wizard if demo seed was loaded.

### Act 2 — Billing & messaging (3 min)

7. **Client show → Workout & diet plans** — confirm assigned program.
8. **Invoices → Create** — pending invoice for Demo Client with a due date near today (shows as **reminder** on client home).
9. **Messages** — select client, send a welcome message.

### Act 3 — Client experience (4 min)

**Web:** `http://localhost:5173/client/login`  
**Mobile:** dev client login with invite code

10. **Home** — reminders (invoice due), plan summary, promotions (if membership has discount).
11. **Workout plan → Log workout** — complete sets, add notes → **Finish workout**.
12. **Training history** — open the session you just logged.
13. **Messages** — reply to coach; switch to coach **Messages** to show bidirectional chat.
14. **Invoices** — view invoice, download PDF.

Client web routes:

- Log: `/client/training/log`
- History: `/client/training/history`
- Session detail: `/client/training/:id`

### Act 4 — Coach wrap-up (2 min)

15. **Coach Desk** (`/`) — due/overdue clients, quick actions.
16. **Dashboard** — KPI cards (clients, invoices, memberships).
17. **Client show → Finance / Membership** — subscription panel.

### Optional wow moments

- **Language switch** to Persian (fa) on coach web — RTL demo.
- **Coach Assistant** (`/assistant`) or MCP in Cursor — needs `OPENAI_API_KEY` + API key from Settings → Integrations.
- **Training plan AI draft** on create/edit — needs OpenAI key.
- **client-mobile** — same client flow on simulator.

## What migrations seed

| Seeded | Not seeded |
|--------|------------|
| Exercise catalog | Coach profile (created on first dev login) |
| Starter training plan | Clients |
| Nutrition templates | Invoices |
| Muscle groups, goal types | Membership plan templates |
| | Assigned coaching plans |

Plan on **~10 minutes of manual setup** before the demo, or pre-create data the day before.

## Troubleshooting

### Client login: “invite_code is required”

Coach must log in first and bootstrap. Copy invite code from **Settings → Branding** and enter it on client login (or set `EXPO_PUBLIC_DEV_INVITE_CODE`).

### Client mobile cannot reach API

- Backend running with `--host 0.0.0.0`
- Correct `EXPO_PUBLIC_API_URL` for simulator/emulator/device (see table above)
- Same Wi‑Fi for physical device

### Log workout fails (500)

Run migrations: `cd backend && alembic upgrade head`  
Requires table `client_workout_sessions`.

### AI features return 503

Set `OPENAI_API_KEY` in `backend/.env`, or skip AI in the demo.

For OpenRouter:

```env
OPENAI_API_KEY=sk-or-…
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=google/gemini-2.0-flash-001
```

### CORS errors (deployed frontend)

Add your frontend origin to `CORS_ORIGINS` in `backend/.env`.

### Empty promotions / reminders

- **Promotions:** create a plan template with a discount price.
- **Reminders:** create a pending/overdue invoice for the client.

## Production demo gaps

Not included out of the box:

- Hosted deployment (Docker / CI) — run locally or set up hosting manually
- Demo seed script — data is created manually
- Online payments — manual “mark paid” + PDF only
- Coach view of client training logs — clients log; coaches don’t see history yet in UI

## Quick reference URLs

| App | URL |
|-----|-----|
| Coach web | http://localhost:5173 |
| Landing page | http://localhost:5173/ |
| Coach desk | http://localhost:5173/desk |
| Client web | http://localhost:5173/client |
| API docs | http://localhost:8000/docs |
| Coach Assistant | http://localhost:5173/assistant |
