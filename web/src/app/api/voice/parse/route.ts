import { z } from "zod";
import { ApiError, getCaller, handle } from "@/server/http";
import { getCatalog } from "@/server/catalog/catalog.service";
import { createRateLimiter } from "@/server/places/places.service";
import { DraftSchema, voiceTurn } from "@/server/voice/voice.service";

const BodySchema = z
  .object({
    // What the customer just said (empty when they tapped a choice instead).
    text: z.string().trim().max(300).default(""),
    // What was understood in the earlier turns of this conversation.
    previous: DraftSchema.nullable().default(null),
    // A tapped answer to the last question.
    choice: z.object({ ask: z.enum(["service", "date", "slot"]), value: z.string().max(20) }).nullable().default(null),
    lang: z.enum(["ne", "en"]).default("ne"),
    // The customer's own date and time, so "today" means their day.
    today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    weekday: z.string().max(12),
  })
  .refine((b) => b.choice || b.text.length >= 2, { message: "Say what you need" });

// Each signed-in person may use voice booking 30 times a minute (a conversation takes a few turns).
const allow = createRateLimiter({ limit: 30, windowMs: 60_000 });

/** POST /api/voice/parse : one turn of the voice conversation. Returns the next question or the finished draft. Books nothing. */
export const POST = handle(async (req: Request) => {
  const caller = await getCaller(req);
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request");
  if (!allow(caller.uid)) throw new ApiError(429, "Too many requests. Please wait a moment.");

  const { text, previous, choice, lang, ...clock } = parsed.data;
  const services = (await getCatalog()).filter((s) => s.active);
  const draft = await voiceTurn({ text, previous, choice, services, clock, lang });
  return Response.json({ draft, heard: text });
});
