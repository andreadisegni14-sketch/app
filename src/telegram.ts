// Thin adapter over the Telegram Bot API (plain fetch, no bot framework).

export interface InlineButton {
  text: string;
  callback_data: string;
}

export interface Update {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string };
    chat: { id: number };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
    message?: { message_id: number; chat: { id: number } };
  };
}

export interface Telegram {
  getUpdates(offset: number): Promise<Update[]>;
  sendMessage(chatId: number, text: string, buttons?: InlineButton[]): Promise<void>;
  editMessage(chatId: number, messageId: number, text: string): Promise<void>;
  answerCallback(callbackId: string, text?: string): Promise<void>;
}

export function createTelegram(token: string): Telegram {
  const call = async <T>(method: string, body: object): Promise<T> => {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000), // longer than the 30s long-poll
    });
    const json = (await res.json()) as { ok: boolean; result: T; description?: string };
    if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
    return json.result;
  };

  return {
    getUpdates: (offset) =>
      call<Update[]>("getUpdates", { offset, timeout: 30, allowed_updates: ["message", "callback_query"] }),
    sendMessage: async (chatId, text, buttons) => {
      await call("sendMessage", {
        chat_id: chatId,
        text,
        ...(buttons && { reply_markup: { inline_keyboard: [buttons] } }),
      });
    },
    editMessage: async (chatId, messageId, text) => {
      await call("editMessageText", { chat_id: chatId, message_id: messageId, text });
    },
    answerCallback: async (callbackId, text) => {
      await call("answerCallbackQuery", { callback_query_id: callbackId, ...(text && { text }) });
    },
  };
}

/** Polling and webhooks are exclusive; make sure no webhook is set. */
export async function deleteWebhook(token: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Telegram rejected the bot token (HTTP ${res.status}). Check TELEGRAM_BOT_TOKEN.`);
}
