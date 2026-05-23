# Client mobile app

Expo Router app for gym clients: **workout & nutrition plans**, **training log**, **invoices**, **messages**, and **promotions**.

## Setup

```bash
cp .env.example .env
npm install
npm run start
```

Press `i` (iOS Simulator), `a` (Android Emulator), or scan QR for Expo Go on a physical device.

Backend must be running (`uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`).

## Environment

| Variable | Example | Notes |
|----------|---------|-------|
| `EXPO_PUBLIC_API_URL` | `http://127.0.0.1:8000` | Full API origin, no trailing slash |
| `EXPO_PUBLIC_DEV_AUTH` | `true` | Use Bearer token `dev-client` |
| `EXPO_PUBLIC_DEV_INVITE_CODE` | from coach Settings | Required on first client signup |

### API URL by target

| Target | `EXPO_PUBLIC_API_URL` |
|--------|------------------------|
| iOS Simulator | `http://127.0.0.1:8000` |
| Android Emulator | `http://10.0.2.2:8000` |
| Physical device | `http://<LAN-IP>:8000` |

Use `--host 0.0.0.0` when starting uvicorn for physical devices.

## Dev login flow

1. Coach logs in on web (`VITE_DEV_AUTH=true`) → **Settings → Branding** → copy **invite code**.
2. Set `EXPO_PUBLIC_DEV_INVITE_CODE` in `.env` or enter on the login screen.
3. Open client app → **Continue (dev client login)**.

Backend: `DEV_BYPASS_AUTH=true`.

## App structure

```
app/
  (auth)/           Login, register
  (tabs)/
    home.tsx        Dashboard, reminders, quick actions
    plans/          Workout + nutrition (segment control)
      log.tsx       Active workout logging
      history.tsx   Past sessions
      [sessionId].tsx  Session detail
    invoices/       List + detail
    messages.tsx    Chat with coach
components/
  training/         LogExerciseCard
  ui/               Shared design system
lib/
  api.ts            Client portal REST client
  trainingLog.ts    Workout entry types + helpers
```

## Features

- **Plans tab** — view assigned workout/nutrition; **Log workout** and **History** from workout plan
- **Training log** — mark sets complete, enter reps/weight, session notes; saved via `POST /client/training/sessions`
- **Home** — reminders, promotions teaser, quick link to log workout
- **Invoices** — list, detail, PDF download
- **Messages** — bidirectional chat with coach

## Production

Set `EXPO_PUBLIC_DEV_AUTH=false` and configure `EXPO_PUBLIC_FIREBASE_*` in `.env`. Clients register with the coach **invite code** via Firebase email/password.

## Notes

- UI strings are **English only** (web client portal has en/fa i18n).
- Same API as client web — see [`frontend/src/lib/clientPortalApi.ts`](../frontend/src/lib/clientPortalApi.ts) for endpoint parity.

See [`DEMO.md`](../DEMO.md) for a full demo walkthrough.
