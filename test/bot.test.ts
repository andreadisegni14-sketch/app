// End-to-end flow against a real Postgres, with Telegram and the model faked.
// Needs TEST_DATABASE_URL, e.g. postgres://wazy:wazy@localhost:5432/wazy_test
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { createBot } from "../src/bot.ts";
import { createPool, createStore, migrate } from "../src/db.ts";
import type { Extraction } from "../src/extraction.ts";
import type { InlineButton, Telegram, Update } from "../src/telegram.ts";
import { zonedToUtc } from "../src/time.ts";

const url = process.env.TEST_DATABASE_URL;
const pool = url ? createPool(url) : null;
const TZ = "Europe/Madrid";

interface Sent { chatId: number; text: string; buttons?: InlineButton[] }

function setup(extraction: Partial<Extraction> | null, start = "2026-10-06T08:00:00Z") {
  const sent: Sent[] = [];
  const edits: string[] = [];
  const answers: (string | undefined)[] = [];
  let clock = new Date(start);
  const telegram: Telegram = {
    getUpdates: async () => [],
    sendMessage: async (chatId, text, buttons) => { sent.push({ chatId, text, buttons }); },
    editMessage: async (_c, _m, text) => { edits.push(text); },
    answerCallback: async (_id, text) => { answers.push(text); },
  };
  let next = extraction;
  const bot = createBot({
    store: createStore(pool!),
    telegram,
    extract: async () => next && {
      is_commitment: true, what: "Send the deck", for_whom: "Marta", due_date: "2026-10-09",
      due_time: null, confidence: 0.9, signals: [], ...next,
    },
    timeZone: TZ,
    reminderTime: "09:00",
    now: () => clock,
  });
  const msg = (text: string | undefined, userId = 42): Update =>
    ({ update_id: 1, message: { message_id: 7, from: { id: userId }, chat: { id: userId }, text } });
  const press = (button: string, userId = 42): Update =>
    ({ update_id: 2, callback_query: { id: "cb", from: { id: userId }, data: button, message: { message_id: 8, chat: { id: userId } } } });
  return {
    bot, sent, edits, answers, msg, press,
    setExtraction: (e: Partial<Extraction> | null) => { next = e; },
    setClock: (iso: string) => { clock = new Date(iso); },
  };
}

const row = async (id: string) => (await pool!.query("select * from commitments where id = $1", [id])).rows[0];
const idOf = (s: Sent) => s.buttons![0].callback_data.split(":")[1];

before(async () => { if (pool) await migrate(pool); });
beforeEach(async () => { if (pool) await pool.query("truncate commitments"); });
after(async () => { await pool?.end(); });

test("capture -> confirm -> reminder on due date -> done", { skip: !pool }, async () => {
  const t = setup({});
  await t.bot.handle(t.msg("told Marta I'd send the deck Friday"));

  assert.equal(t.sent.length, 1);
  assert.match(t.sent[0].text, /Send the deck/);
  assert.match(t.sent[0].text, /Marta/);
  assert.match(t.sent[0].text, /Friday 9 October/);
  assert.deepEqual(t.sent[0].buttons!.map((b) => b.text), ["✅ Confirm", "✏️ Edit", "🙈 Ignore"]);

  const id = idOf(t.sent[0]);
  const proposed = await row(id);
  assert.equal(proposed.status, "proposed");
  assert.equal(proposed.source_ref, "42:7");
  assert.ok(!JSON.stringify(proposed).includes("told Marta"), "raw message must not be stored");

  await t.bot.handle(t.press(`confirm:${id}`));
  assert.equal((await row(id)).status, "confirmed");
  assert.match(t.edits[0], /Confirmed/);

  // Before 09:00 Madrid on Friday: nothing. After: exactly one reminder.
  t.setClock("2026-10-09T06:59:00Z");
  assert.equal(await t.bot.sendDueReminders(), 0);
  t.setClock("2026-10-09T07:00:00Z");
  assert.equal(await t.bot.sendDueReminders(), 1);
  assert.equal(await t.bot.sendDueReminders(), 0);
  const reminder = t.sent.at(-1)!;
  assert.match(reminder.text, /Reminder/);
  assert.deepEqual(reminder.buttons!.map((b) => b.text), ["✅ Done", "💤 Snooze 1 day", "🗑 Drop"]);

  await t.bot.handle(t.press(`done:${id}`));
  const done = await row(id);
  assert.equal(done.status, "done");
  assert.ok(done.answered_at);
});

test("snooze reminds again one day later, drop stops it", { skip: !pool }, async () => {
  const t = setup({});
  await t.bot.handle(t.msg("deck for Marta friday"));
  const id = idOf(t.sent[0]);
  await t.bot.handle(t.press(`confirm:${id}`));

  t.setClock("2026-10-09T07:00:00Z");
  await t.bot.sendDueReminders();
  await t.bot.handle(t.press(`snooze:${id}`));
  const snoozed = await row(id);
  assert.equal(snoozed.status, "snoozed");
  assert.equal(snoozed.snooze_count, 1);

  t.setClock("2026-10-10T06:59:00Z");
  assert.equal(await t.bot.sendDueReminders(), 0);
  t.setClock("2026-10-10T07:00:00Z");
  assert.equal(await t.bot.sendDueReminders(), 1);

  await t.bot.handle(t.press(`drop:${id}`));
  assert.equal((await row(id)).status, "dropped");
  t.setClock("2026-10-20T07:00:00Z");
  assert.equal(await t.bot.sendDueReminders(), 0);
});

test("edit replaces the proposal with the corrected version", { skip: !pool }, async () => {
  const t = setup({});
  await t.bot.handle(t.msg("deck for Marta friday"));
  const id = idOf(t.sent[0]);
  await t.bot.handle(t.press(`edit:${id}`));
  assert.match(t.edits[0], /corrected version/);

  t.setExtraction({ what: "Send the final deck", due_date: "2026-10-12", due_time: "15:00" });
  await t.bot.handle(t.msg("actually the final deck, Monday 3pm"));
  const edited = await row(id);
  assert.equal(edited.what, "Send the final deck");
  assert.equal(edited.edit_count, 1);
  assert.equal(edited.awaiting_edit, false);
  assert.equal(edited.remind_at.toISOString(), zonedToUtc("2026-10-12", "15:00", TZ).toISOString());
  assert.equal(idOf(t.sent.at(-1)!), id, "the new proposal points to the same record");
  assert.equal((await pool!.query("select count(*)::int as n from commitments")).rows[0].n, 1);
});

test("ignore means no reminder; unconfirmed proposals never remind", { skip: !pool }, async () => {
  const t = setup({});
  await t.bot.handle(t.msg("a"));
  await t.bot.handle(t.msg("b"));
  const [ignored, unanswered] = [idOf(t.sent[0]), idOf(t.sent[1])];
  await t.bot.handle(t.press(`ignore:${ignored}`));
  assert.equal((await row(ignored)).status, "ignored");
  assert.equal((await row(unanswered)).status, "proposed");
  t.setClock("2026-10-20T07:00:00Z");
  assert.equal(await t.bot.sendDueReminders(), 0);
});

test("buttons only work once and only for their owner", { skip: !pool }, async () => {
  const t = setup({});
  await t.bot.handle(t.msg("deck"));
  const id = idOf(t.sent[0]);
  await t.bot.handle(t.press(`confirm:${id}`, 999));
  assert.equal((await row(id)).status, "proposed");
  await t.bot.handle(t.press(`confirm:${id}`));
  await t.bot.handle(t.press(`ignore:${id}`));
  assert.equal((await row(id)).status, "confirmed");
  assert.deepEqual(t.answers, ["Already handled.", undefined, "Already handled."]);
  await t.bot.handle(t.press("confirm:not-a-uuid"));
});

test("non-commitments are logged with signals but get no buttons", { skip: !pool }, async () => {
  const t = setup({ is_commitment: false, what: "Asked what they still owe", due_date: null, signals: ["asked_what_owed"] });
  await t.bot.handle(t.msg("what do I still owe?"));
  assert.equal(t.sent[0].buttons, undefined);
  const { rows } = await pool!.query("select * from commitments");
  assert.equal(rows[0].status, "not_commitment");
  assert.deepEqual(rows[0].signals, ["asked_what_owed"]);
});

test("due today after reminder time: remind in an hour", { skip: !pool }, async () => {
  const t = setup({ due_date: "2026-10-06" }, "2026-10-06T15:00:00Z");
  await t.bot.handle(t.msg("send it today"));
  const c = await row(idOf(t.sent[0]));
  assert.equal(c.remind_at.toISOString(), "2026-10-06T16:00:00.000Z");
});

test("text only; model failures get a friendly reply", { skip: !pool }, async () => {
  const t = setup(null);
  await t.bot.handle(t.msg(undefined));
  assert.match(t.sent[0].text, /only understand text/);
  await t.bot.handle(t.msg("???"));
  assert.match(t.sent[1].text, /couldn't read/);
  await t.bot.handle(t.msg("/start"));
  assert.match(t.sent[2].text, /I'm Wazy/);
  assert.equal((await pool!.query("select count(*)::int as n from commitments")).rows[0].n, 0);
});

test("timezone conversion handles DST", () => {
  assert.equal(zonedToUtc("2026-10-09", "09:00", TZ).toISOString(), "2026-10-09T07:00:00.000Z"); // CEST
  assert.equal(zonedToUtc("2026-11-09", "09:00", TZ).toISOString(), "2026-11-09T08:00:00.000Z"); // CET
});
