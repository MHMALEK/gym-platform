# Coach web + client portal

Refine + MUI single-page app. Serves both the **coach dashboard** and the **client portal** (`/client/*`).

## Setup

```bash
npm install
cp .env.example .env.local   # optional; .env.development is committed for dev
npm run dev
```

- Coach app: http://localhost:5173
- **Landing page:** http://localhost:5173/
- Coach desk (after login): http://localhost:5173/desk
- Client portal: http://localhost:5173/client/login

Vite proxies `/api` → `http://127.0.0.1:8000` (see `vite.config.ts`). Start the backend first.

## Environment

| Variable | Dev default | Purpose |
|----------|-------------|---------|
| `VITE_DEV_AUTH` | `true` in `.env.development` | Skip Firebase; use Bearer `dev` / `dev-client` |
| `VITE_API_URL` | empty | API origin; empty = proxy via Vite |
| `VITE_FIREBASE_*` | — | Production auth + Storage uploads |

See [`.env.example`](.env.example) for production Firebase vars.

## Dev login

**Coach:** `/login` → Continue (dev login) → auto `POST /auth/bootstrap`.

**Client:** `/client/login` → invite code (from coach **Settings → Branding**) on first signup → Continue (dev client login) → Bearer `dev-client`.

Backend must have `DEV_BYPASS_AUTH=true`.

## Routes

### Coach (`/`)

Main resources: Coach Desk, Dashboard, Clients, Invoices, Messages, Training plans, Nutrition templates, Plan templates (memberships), Library catalog, Settings (Branding, Integrations), Coach Assistant.

### Client portal (`/client`)

| Route | Page |
|-------|------|
| `/client` | Home (reminders, promotions, plan summary) |
| `/client/plans/workout` | Workout plan + log/history links |
| `/client/plans/nutrition` | Nutrition plan |
| `/client/training/log` | Log workout (sets/reps from assigned plan) |
| `/client/training/history` | Past sessions |
| `/client/training/:id` | Session detail |
| `/client/invoices` | Invoice list + PDF |
| `/client/messages` | Chat with coach |
| `/client/promotions` | Membership offers |

Client API helpers: [`src/lib/clientPortalApi.ts`](src/lib/clientPortalApi.ts).

## i18n

English and Persian (fa) with RTL. Default locale is **fa** (`src/i18n/index.ts`). Switch language from the UI or set initial locale there for English-first demos.

Locales: [`src/locales/en/translation.ts`](src/locales/en/translation.ts), [`src/locales/fa/translation.ts`](src/locales/fa/translation.ts).

## Build

```bash
npm run build    # output: dist/
npm run preview  # preview production build
```

Deploy `dist/` to static hosting. Set `VITE_API_URL` to your API origin in production.

## Project structure

```
src/
  App.tsx              Coach + client route trees
  authProvider.ts      Coach Firebase / dev auth
  clientAuthProvider.ts Client portal auth
  dataProvider.ts      Refine REST adapter
  pages/client/        Client portal pages
  pages/               Coach pages
  lib/clientPortalApi.ts  Client REST client
  components/client/   ClientShell layout
```

See root [`README.md`](../README.md) and [`DEMO.md`](../DEMO.md) for full platform setup.
