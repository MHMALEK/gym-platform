# Gym Coach Platform

Coach dashboard (Refine + Ant Design) and REST API (FastAPI) for clients, **membership** products, **custom exercises**, **training plans**, and a **shared library** (catalog exercises and programs). Auth is **Firebase** in production; local development can use **dev bypass** (no Firebase).

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # edit DATABASE_URL / Firebase / DEV_BYPASS_AUTH
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API base: `http://localhost:8000/api/v1`
- OpenAPI: `http://localhost:8000/docs`
- With `DEV_BYPASS_AUTH=true`, send any non-empty `Authorization: Bearer <token>` and the fixed dev user is used.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:8000`. With `VITE_DEV_AUTH=true` (see `.env.development`), use **Continue (dev login)** on the login screen, then call bootstrap automatically.

Set `VITE_API_URL` only if the API is on another origin (empty uses same-origin + proxy).

## Firebase (production)

1. Create a Firebase project; enable **Authentication** (e.g. email/password).
2. Download a **service account** JSON and set `FIREBASE_CREDENTIALS_PATH` (or `GOOGLE_APPLICATION_CREDENTIALS`) on the API.
3. Add the web app config to the frontend env (`VITE_FIREBASE_*`) and set `VITE_DEV_AUTH=false`.
4. Deploy the SPA build to **Firebase Hosting** (`frontend/dist` after `npm run build`).

## Project layout

- `backend/app` — FastAPI, SQLAlchemy models, routers under `api/`
- `frontend/src` — Refine resources, custom REST `dataProvider`, Firebase/dev `authProvider`
