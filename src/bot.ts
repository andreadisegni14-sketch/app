// The whole MVP flow: capture -> extract -> confirm -> remind -> Done / Snooze / Drop.
import type { Store } from "./db.ts";
import type { Extraction, Extractor } from "./extraction.ts";
import type { InlineButton, Telegram, Update } from "./telegram.ts";
import { formatDay, localTime, zonedToUtc } from "./time.ts";

export interface BotDeps {
  store: Store;
  telegram: Telegram;
  extract: Extractor;
  timeZone: string;
  reminderTime: string;
  now?: () => Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const WELCOME =
  "Hi, I'm Wazy.\n\n" +
  "The moment you promise someone something, send it to me, e.g.\n" +
  "\"told Marta I'd send the deck Friday\"\n\n" +
  "I'll check what I understood, and on the day I'll remind you once.";

export function createBot(deps: BotDeps) {
  const now = deps.now ?? (() => new Date());

  function schedule(e: Extraction, at: Date): { dueAt: Date | null; remindAt: Date | null } {
    if (!e.due_date) return { dueAt: null, remindAt: null };
    const dueAt = zonedToUtc(e.due_date, e.due_time ?? "23:59", deps.timeZone);
    let remindAt = zonedToUtc(e.due_date, e.due_time ?? deps.reminderTime, deps.timeZone);
    // Due today and the reminder time has passed: remind in an hour instead.
    if (remindAt.getTime() <= at.getTime()) remindAt = new Date(at.getTime() + 60 * 60 * 1000);
    return { dueAt, remindAt };
  }

  function summary(c: { what: string; for_whom: string | null; due_at: Date | null; remind_at: Date | null }): string {
    const lines = [`📝 ${c.what}`];
    if (c.for_whom) lines.push(`👤 For: ${c.for_whom}`);
    if (c.due_at) lines.push(`📅 By: ${formatDay(c.due_at, deps.timeZone)}`);
    if (c.remind_at) {
      lines.push(`⏰ Reminder: ${formatDay(c.remind_at, deps.timeZone)}, ${localTime(c.remind_at, deps.timeZone)}`);
    }
    return lines.join("\n");
  }

  const proposalButtons = (id: string): InlineButton[] => [
    { text: "✅ Confirm", callback_data: `confirm:${id}` },
    { text: "✏️ Edit", callback_data: `edit:${id}` },
    { text: "🙈 Ignore", callback_data: `ignore:${id}` },
  ];

  const reminderButtons = (id: string): InlineButton[] => [
    { text: "✅ Done", callback_data: `done:${id}` },
    { text: "💤 Snooze 1 day", callback_data: `snooze:${id}` },
    { text: "🗑 Drop", callback_data: `drop:${id}` },
  ];

  async function onMessage(msg: NonNullable<Update["message"]>): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId) return;

    if (!msg.text) {
      await deps.telegram.sendMessage(chatId, "I only understand text for now. Type the commitment in a message.");
      return;
    }
    if (msg.text.startsWith("/start") || msg.text.startsWith("/help")) {
      await deps.telegram.sendMessage(chatId, WELCOME);
      return;
    }

    const at = now();
    let extraction: Extraction | null;
    try {
      extraction = await deps.extract(msg.text, at);
    } catch (err) {
      console.error("extraction failed:", (err as Error).message);
      extraction = null;
    }
    if (!extraction) {
      await deps.telegram.sendMessage(chatId, "Sorry, I couldn't read that one. Could you rephrase it?");
      return;
    }

    const { dueAt, remindAt } = schedule(extraction, at);
    const pending = extraction.is_commitment ? await deps.store.findAwaitingEdit(userId) : null;

    if (pending) {
      const c = await deps.store.applyEdit(pending.id, {
        what: extraction.what,
        forWhom: extraction.for_whom,
        dueAt,
        remindAt,
        confidence: extraction.confidence,
        signals: extraction.signals,
      });
      await deps.telegram.sendMessage(chatId, `Updated:\n\n${summary(c)}`, proposalButtons(c.id));
      return;
    }

    const c = await deps.store.insert({
      telegramUserId: userId,
      telegramChatId: chatId,
      what: extraction.what,
      forWhom: extraction.is_commitment ? extraction.for_whom : null,
      dueAt: extraction.is_commitment ? dueAt : null,
      remindAt: extraction.is_commitment ? remindAt : null,
      status: extraction.is_commitment ? "proposed" : "not_commitment",
      sourceRef: `${chatId}:${msg.message_id}`,
      confidence: extraction.confidence,
      signals: extraction.signals,
    });

    if (!extraction.is_commitment) {
      await deps.telegram.sendMessage(
        chatId,
        "I didn't spot a commitment in that. Send me something you promised, e.g. \"send Marta the deck by Friday\".",
      );
      return;
    }
    await deps.telegram.sendMessage(chatId, summary(c), proposalButtons(c.id));
  }

  async function onCallback(cb: NonNullable<Update["callback_query"]>): Promise<void> {
    const [action, id] = (cb.data ?? "").split(":");
    const userId = cb.from.id;
    const chatId = cb.message?.chat.id;
    const messageId = cb.message?.message_id;
    const at = now();
    const { store } = deps;

    let reply: string | null = null;
    switch (action) {
      case "confirm": {
        const c = await store.transition(id, userId, ["proposed"],
          "status = 'confirmed', confirmed_at = $4, awaiting_edit = false", [at]);
        if (c) reply = `${summary(c)}\n\n✅ Confirmed. I'll remind you then.`;
        break;
      }
      case "edit": {
        const c = await store.transition(id, userId, ["proposed"], "awaiting_edit = true");
        if (c) reply = `${summary(c)}\n\n✏️ Send me the corrected version as a new message.`;
        break;
      }
      case "ignore": {
        const c = await store.transition(id, userId, ["proposed"], "status = 'ignored', awaiting_edit = false");
        if (c) reply = `${c.what}\n\n🙈 Ignored. I won't remind you about it.`;
        break;
      }
      case "done": {
        const c = await store.transition(id, userId, ["confirmed", "snoozed"],
          "status = 'done', answered_at = $4, remind_at = null", [at]);
        if (c) reply = `${c.what}\n\n🎉 Done. Nice one.`;
        break;
      }
      case "snooze": {
        const c = await store.transition(id, userId, ["confirmed", "snoozed"],
          "status = 'snoozed', snooze_count = snooze_count + 1, remind_at = $4",
          [new Date(at.getTime() + DAY_MS)]);
        if (c) reply = `${c.what}\n\n💤 Snoozed. I'll remind you again tomorrow at ${localTime(c.remind_at!, deps.timeZone)}.`;
        break;
      }
      case "drop": {
        const c = await store.transition(id, userId, ["confirmed", "snoozed"],
          "status = 'dropped', answered_at = $4, remind_at = null", [at]);
        if (c) reply = `${c.what}\n\n🗑 Dropped. No more reminders for this one.`;
        break;
      }
    }

    await deps.telegram.answerCallback(cb.id, reply ? undefined : "Already handled.");
    if (reply && chatId && messageId) await deps.telegram.editMessage(chatId, messageId, reply);
  }

  return {
    async handle(update: Update): Promise<void> {
      if (update.message) await onMessage(update.message);
      else if (update.callback_query) await onCallback(update.callback_query);
    },

    /** Sends every reminder that is due. Called once a minute. */
    async sendDueReminders(): Promise<number> {
      const due = await deps.store.claimDueReminders(now());
      for (const c of due) {
        try {
          await deps.telegram.sendMessage(Number(c.telegram_chat_id), `⏰ Reminder\n\n${summary({ ...c, remind_at: null })}`,
            reminderButtons(c.id));
        } catch (err) {
          console.error(`reminder ${c.id} failed, will retry:`, (err as Error).message);
          await deps.store.releaseReminder(c.id, new Date(now().getTime() + 5 * 60 * 1000));
        }
      }
      return due.length;
    },
  };
}
