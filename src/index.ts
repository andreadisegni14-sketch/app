import { createBot } from "./bot.ts";
import { loadConfig } from "./config.ts";
import { createPool, createStore, migrate } from "./db.ts";
import { createExtractor } from "./extraction.ts";
import { createTelegram, deleteWebhook } from "./telegram.ts";

const config = loadConfig();
const pool = createPool(config.databaseUrl);
await migrate(pool);

const telegram = createTelegram(config.telegramToken);
const bot = createBot({
  store: createStore(pool),
  telegram,
  extract: createExtractor(config.anthropicModel, config.timeZone),
  timeZone: config.timeZone,
  reminderTime: config.reminderTime,
});

// Reminders: check once a minute.
setInterval(() => {
  bot.sendDueReminders().catch((err) => console.error("reminder loop:", (err as Error).message));
}, 60_000);

await deleteWebhook(config.telegramToken);
console.log(`Wazy bot running (timezone ${config.timeZone}). Open your bot in Telegram and send /start.`);

// Messages: long-poll Telegram. Each update is handled on its own so one failure never stops the bot.
let offset = 0;
for (;;) {
  let updates;
  try {
    updates = await telegram.getUpdates(offset);
  } catch (err) {
    console.error("polling:", (err as Error).message);
    await new Promise((r) => setTimeout(r, 5_000));
    continue;
  }
  for (const update of updates) {
    offset = update.update_id + 1;
    try {
      await bot.handle(update);
    } catch (err) {
      console.error(`update ${update.update_id}:`, (err as Error).message);
    }
  }
}
