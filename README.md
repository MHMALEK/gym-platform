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

## Mobile app (Expo)

Basic **clients** and **invoices** flows (no workout builder). Copy [`mobile/.env.example`](mobile/.env.example) to `mobile/.env` and set `EXPO_PUBLIC_API_URL` to your machine or deployed API. Start the API, then:

```bash
cd mobile
npm install
npm run start
```

Use **Continue (dev login)** when `EXPO_PUBLIC_DEV_AUTH=true` and the backend has `DEV_BYPASS_AUTH=true`, or sign in with Firebase email/password when the `EXPO_PUBLIC_FIREBASE_*` variables are set.

## Firebase (production)

1. Create a Firebase project; enable **Authentication** (e.g. email/password).
2. Enable **Storage** in the Firebase console and deploy rules from this repo: `firebase deploy --only storage` (uses [`firebase/storage.rules`](firebase/storage.rules); install the [Firebase CLI](https://firebase.google.com/docs/cli) and run `firebase login` / `firebase use <projectId>` first).
3. Download a **service account** JSON and set `FIREBASE_CREDENTIALS_PATH` (or `GOOGLE_APPLICATION_CREDENTIALS`) on the API.
4. Copy [`frontend/.env.example`](frontend/.env.example) to `frontend/.env.production` (or your host’s env UI). Set `VITE_DEV_AUTH=false`, fill all `VITE_FIREBASE_*` values from **Project settings → Your apps → Web app**, and set **`VITE_FIREBASE_STORAGE_BUCKET`** (e.g. `your-project.appspot.com`). With a real Firebase sign-in, exercise media uploads go to **Firebase Storage** under `coaches/{uid}/media/…` and the API records them via `POST /media/register`. With `VITE_DEV_AUTH=true`, uploads keep using the API disk path (`POST /media/upload`).
5. Deploy the SPA build to **Firebase Hosting** (`frontend/dist` after `npm run build`).

## Project layout

- `backend/app` — FastAPI, SQLAlchemy models, routers under `api/`
- `frontend/src` — Refine resources, custom REST `dataProvider`, Firebase/dev `authProvider`
- `mobile/` — Expo Router app for clients + invoices (REST + SecureStore token)
