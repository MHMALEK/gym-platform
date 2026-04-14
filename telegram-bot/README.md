# Telegram Bot MVP

Basic Telegram bot built with Node.js + TypeScript + Telegraf in polling mode.

## 1) Create your bot token

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Run `/newbot`
3. Copy the token

## 2) Configure env

```bash
cp .env.example .env
```

Set `TELEGRAM_BOT_TOKEN` in `.env`.

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
- `/help` command list
- `/ping` returns `pong`
- `/echo <text>` echoes input
