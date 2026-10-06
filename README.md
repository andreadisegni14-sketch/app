# Wazy — MVP

A Telegram bot that turns a commitment you just made into a confirmed reminder, and checks whether you did it.

Built to the fence in [scope.md](scope.md); architecture and decisions in [architecturedoc.md](architecturedoc.md).

## What it does (and nothing else)

1. You message the bot the moment you promise something: *"told Marta I'd send the deck Friday"*.
2. It extracts **what / for whom / by when** and replies with buttons: **Confirm · Edit · Ignore**.
3. On the due date (09:00 Madrid time, or the time you gave) it sends **one** reminder: **Done · Snooze 1 day · Drop**.
4. Every capture, confirmation and answer goes into one table: `commitments`.

Text only. No app, website, login, calendar, email, dashboard or analytics tool — see `scope.md` §2.

## Run it

You need **Node 22.9+**, plus three things:

| What | Where to get it |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | In Telegram, message **@BotFather** → `/newbot` → copy the token |
| `DATABASE_URL` | Supabase → new project (EU region) → **Connect** → connection string (URI). Leave out `?sslmode=…`. |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |

```bash
npm install
cp .env.example .env      # then paste the three values in
npm start
```

The table is created on first start. When you see `Wazy bot running`, **open Telegram, search for the bot username you chose in BotFather, and press Start.** Then send it a commitment.

Keep the terminal open: the bot runs while `npm start` runs (it polls Telegram and checks for due reminders every minute). For the 2-week pilot, run it on any always-on machine or small host (Railway, Render, Fly.io, a VPS) with the same three variables.

Optional settings: `TIMEZONE` (default `Europe/Madrid`), `REMINDER_TIME` (default `09:00`), `ANTHROPIC_MODEL` (default `claude-opus-5-5`).

## Read the pilot results

`db/pilot_queries.sql` has the queries for the proof signal (≥3 captures/week for half the users in week 2), the secondary signal (% Done), the kill signal, and the "3 users did it manually" counts. Paste them into the Supabase SQL editor.

## Tests

```bash
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/wazy_test npm test
npm run typecheck
```

Tests run the full flow against a real Postgres with Telegram and the model faked.

## Layout

```
src/index.ts       starts polling + the once-a-minute reminder check
src/bot.ts         the flow: capture, confirm/edit/ignore, reminders, done/snooze/drop
src/extraction.ts  the only model call (structured output, validated with zod)
src/telegram.ts    thin Bot API adapter (plain fetch)
src/db.ts          the commitments table
prompts/           versioned prompts (never inline in code)
db/schema.sql      the one table
```
