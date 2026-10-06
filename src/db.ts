import { readFileSync } from "node:fs";
import pg from "pg";

export interface Commitment {
  id: string;
  telegram_user_id: string;
  telegram_chat_id: string;
  what: string;
  for_whom: string | null;
  due_at: Date | null;
  status: "proposed" | "confirmed" | "snoozed" | "done" | "dropped" | "ignored" | "not_commitment";
  remind_at: Date | null;
  awaiting_edit: boolean;
}

export interface NewCommitment {
  telegramUserId: number;
  telegramChatId: number;
  what: string;
  forWhom: string | null;
  dueAt: Date | null;
  remindAt: Date | null;
  status: "proposed" | "not_commitment";
  sourceRef: string;
  confidence: number;
  signals: string[];
}

export function createPool(databaseUrl: string): pg.Pool {
  const host = new URL(databaseUrl).hostname;
  const local = host === "localhost" || host === "127.0.0.1";
  return new pg.Pool({ connectionString: databaseUrl, ssl: local ? false : { rejectUnauthorized: false } });
}

export async function migrate(pool: pg.Pool): Promise<void> {
  await pool.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
}

export function createStore(pool: pg.Pool) {
  return {
    async insert(c: NewCommitment): Promise<Commitment> {
      const { rows } = await pool.query<Commitment>(
        `insert into commitments
           (telegram_user_id, telegram_chat_id, what, for_whom, due_at, remind_at, status,
            source_ref, confidence, signals)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning *`,
        [c.telegramUserId, c.telegramChatId, c.what, c.forWhom, c.dueAt, c.remindAt, c.status,
         c.sourceRef, c.confidence, c.signals],
      );
      return rows[0];
    },

    /** The proposal this user asked to edit, if any. */
    async findAwaitingEdit(telegramUserId: number): Promise<Commitment | null> {
      const { rows } = await pool.query<Commitment>(
        `select * from commitments
          where telegram_user_id = $1 and awaiting_edit and status = 'proposed'
          order by updated_at desc limit 1`,
        [telegramUserId],
      );
      return rows[0] ?? null;
    },

    async applyEdit(
      id: string,
      e: { what: string; forWhom: string | null; dueAt: Date | null; remindAt: Date | null; confidence: number; signals: string[] },
    ): Promise<Commitment> {
      const { rows } = await pool.query<Commitment>(
        `update commitments
            set what = $2, for_whom = $3, due_at = $4, remind_at = $5, confidence = $6,
                signals = (select array(select distinct unnest(signals || $7::text[]))),
                awaiting_edit = false, edit_count = edit_count + 1, updated_at = now()
          where id = $1 returning *`,
        [id, e.what, e.forWhom, e.dueAt, e.remindAt, e.confidence, e.signals],
      );
      return rows[0];
    },

    /**
     * Moves a commitment from one of `from` to a new state, only if it belongs to the user.
     * Returns null when the button is stale (already answered) or not theirs.
     */
    async transition(
      id: string,
      telegramUserId: number,
      from: Commitment["status"][],
      set: string,
      params: unknown[] = [],
    ): Promise<Commitment | null> {
      if (!/^[0-9a-f-]{36}$/.test(id)) return null;
      const { rows } = await pool.query<Commitment>(
        `update commitments set ${set}, updated_at = now()
          where id = $1 and telegram_user_id = $2 and status = any($3) returning *`,
        [id, telegramUserId, from, ...params],
      );
      return rows[0] ?? null;
    },

    /** Atomically claims reminders that are due, so each is sent once. */
    async claimDueReminders(now: Date): Promise<Commitment[]> {
      const { rows } = await pool.query<Commitment>(
        `update commitments set remind_at = null, reminded_at = $1, updated_at = now()
          where id in (
            select id from commitments
             where remind_at <= $1 and status in ('confirmed', 'snoozed')
             for update skip locked)
          returning *`,
        [now],
      );
      return rows;
    },

    async releaseReminder(id: string, remindAt: Date): Promise<void> {
      await pool.query(`update commitments set remind_at = $2, reminded_at = null where id = $1`, [id, remindAt]);
    },
  };
}

export type Store = ReturnType<typeof createStore>;
