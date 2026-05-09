# Telegram Gym Coach Bot MVP

Telegram bot for gym coaches, built with Node.js + TypeScript + Telegraf in polling mode.
It is an interface for the existing backend API (same clients and invoices as the app).

## 1) Create your bot token

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Run `/newbot`
3. Copy the token

## 2) Configure env

```bash
cp .env.example .env
```

Set env values in `.env`:

- `TELEGRAM_BOT_TOKEN`
- `BACKEND_API_BASE_URL` (for example `http://localhost:8000`)
- either `BACKEND_API_KEY` or `BACKEND_BEARER_TOKEN`

## 3) Install and run

```bash
npm install
npm run dev
```

You should see:

```text
Telegram bot is running (polling mode).
```

## Commands

- `/start` welcome message
- `/menu` show button-based main menu
- `/cancel` cancel active guided flow
- `/help` command list
- `/ping` returns `pong`
- `/add_client <name | email? | phone? | goal?>`
- `/clients`
- `/client <clientId>`
- `/invoice <clientId | amount | dueDate(YYYY-MM-DD) | note?>`
- `/invoices [pending|paid|overdue]`
- `/mark_paid <invoiceId>`
- `/overdue`
- `/checkin` and `/checkins` (placeholder until backend adds endpoint)
- `/reminders`

## UX updates

After `/start` (or `/menu`) the bot shows a persistent keyboard for common actions:
Clients, Invoices, Overdue, Reminders, Add Client, Create Invoice, Add Check-in, Help, and Cancel Flow.

`Add Client` and `Create Invoice` now support guided step-by-step chat flows.
Use `skip` for optional fields and `/cancel` to abort the current flow.
