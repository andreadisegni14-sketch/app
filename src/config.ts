function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

export function loadConfig() {
  return {
    telegramToken: required("TELEGRAM_BOT_TOKEN"),
    databaseUrl: required("DATABASE_URL"),
    anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5",
    timeZone: process.env.TIMEZONE ?? "Europe/Madrid",
    // Reminders go out at this local time on the due date unless the user gave a time.
    reminderTime: process.env.REMINDER_TIME ?? "09:00",
  };
}

export type Config = ReturnType<typeof loadConfig>;
