// The one module that talks to the model (Architecture Doc §4 conventions).
import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { todayLabel } from "./time.ts";

export const PROMPT_VERSION = "extract.v1";
const SYSTEM_PROMPT = readFileSync(new URL(`../prompts/${PROMPT_VERSION}.md`, import.meta.url), "utf8");

export const Extraction = z.object({
  is_commitment: z.boolean(),
  what: z.string(),
  for_whom: z.string().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  due_time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  confidence: z.number().min(0).max(1),
  signals: z.array(z.enum(["pasted_email", "calendar_request", "asked_what_owed"])),
});
export type Extraction = z.infer<typeof Extraction>;

export type Extractor = (text: string, now: Date) => Promise<Extraction | null>;

export function createExtractor(model: string, timeZone: string): Extractor {
  const client = new Anthropic();
  return async (text, now) => {
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 4000,
      output_config: { effort: "low", format: betaZodOutputFormat(Extraction) },
      // On a safety decline, re-run on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Today is ${todayLabel(now, timeZone)}.\n\nMessage:\n${text}` }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return null;
    // Validate again before anything reaches the database.
    const checked = Extraction.safeParse(response.parsed_output);
    return checked.success ? checked.data : null;
  };
}
