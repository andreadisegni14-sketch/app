-- Wazy MVP: the one table (Scope Sheet §1, "Every capture, confirmation and answer
-- is written to one database table"). Safe to run repeatedly; the bot runs it on start.
-- Raw message text is never stored (Architecture Doc principle 6).

create extension if not exists pgcrypto;

create table if not exists commitments (
  id               uuid primary key default gen_random_uuid(),
  telegram_user_id bigint      not null,              -- the identity (no accounts in the MVP)
  telegram_chat_id bigint      not null,
  what             text        not null,              -- extracted action, never the raw message
  for_whom         text,
  due_at           timestamptz,
  status           text        not null default 'proposed'
                   check (status in ('proposed', 'confirmed', 'snoozed', 'done',
                                     'dropped', 'ignored', 'not_commitment')),
  source           text        not null default 'telegram' check (source in ('telegram')),
  source_ref       text        not null,              -- "<chat_id>:<message_id>", a pointer only
  confidence       numeric,
  signals          text[]      not null default '{}', -- behaviours for the "rule for adding later"
  awaiting_edit    boolean     not null default false,
  edit_count       integer     not null default 0,
  remind_at        timestamptz,                       -- next reminder; null once sent or closed
  reminded_at      timestamptz,
  snooze_count     integer     not null default 0,
  confirmed_at     timestamptz,
  answered_at      timestamptz,                       -- when Done / Drop was pressed
  created_at       timestamptz not null default now(), -- = capture time
  updated_at       timestamptz not null default now()
);

create index if not exists commitments_due_reminders
  on commitments (remind_at) where remind_at is not null;
create index if not exists commitments_user
  on commitments (telegram_user_id, created_at);
