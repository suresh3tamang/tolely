import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { ApiError } from "@/server/http";
import { SLOTS, type SlotId } from "@/shared/schedule";
import type { Service } from "@/shared/services";
import { choiceAsDraft, merge, nextStep, type VoiceAnswer } from "./conversation";
import { parseWithRules } from "./rules-parser";

// Voice booking: "plumber chaiyo aaja nai" -> a draft booking the customer confirms.
//
// By default this is free: word lists in rules-parser.ts understand common requests.
// Optionally, with ANTHROPIC_API_KEY set, Claude reads what the customer said (Nepali, Romanized Nepali or English) and fills in the same fields as
// the booking form. It never books anything: the draft goes back to the customer, who checks it and taps
// Confirm, and the normal booking endpoint then re-checks everything (price, time, phone) as usual.

const MODEL = "claude-opus-5-5";
const SLOT_IDS = ["asap", ...SLOTS.map((s) => s.id)] as const;

/** What Claude returns. Kept flat and simple so it is easy to check. */
export const DraftSchema = z.object({
  understood: z.boolean().describe("false if the request is not about booking one of the services"),
  serviceKey: z.string().nullable().describe("key of the service from the list, or null"),
  optionId: z.string().nullable().describe("id of the option (size/type) if the customer said one, else null"),
  date: z.string().nullable().describe("the day as YYYY-MM-DD, or null if not said"),
  slot: z.enum(SLOT_IDS).nullable().describe("time window id, or null if not said"),
  contactName: z.string().nullable().describe("a different person to contact, only if said"),
  contactPhone: z.string().nullable().describe("digits of a phone number to call, only if said"),
  note: z.string().describe("anything else the supplier should know, short, in the customer's words; empty if nothing"),
  reply: z.string().describe("one short friendly sentence to the customer, in their language"),
});
export type Draft = z.infer<typeof DraftSchema>;

/** The customer's own clock, so "today" and "this evening" mean their day, not the server's. */
export type ClientClock = { today: string; time: string; weekday: string };

export function buildSystemPrompt(services: Service[], clock: ClientClock, lang: "ne" | "en"): string {
  const catalog = services
    .map((s) => {
      const options = s.options.map((o) => `    - option "${o.id}": ${o.labelEn} / ${o.labelNe}, Rs ${o.price}`).join("\n");
      return `- service "${s.key}": ${s.nameEn} / ${s.nameNe}\n${options}`;
    })
    .join("\n");
  const windows = SLOTS.map((s) => `"${s.id}" (${s.from}:00-${s.to}:00)`).join(", ");

  return `You turn a customer's short spoken request into a booking draft for Tolely, a home-services app in Kathmandu, Nepal.
The customer may speak Nepali (Devanagari), Romanized Nepali (e.g. "plumber chaiyo aaja nai", "bholi bihana tanker pathaunu"), English, or a mix. Speech-to-text may misspell words; read for meaning.

Services you can book (use these exact keys and option ids):
${catalog}

The customer's clock: today is ${clock.weekday} ${clock.today}, the time is ${clock.time} (Nepal time).
Time windows: "asap" (as soon as possible, today only), ${windows}.

How to fill the draft:
- serviceKey: the service they asked for. Common words: paani/pani/water/tanker -> water tanker; tanki safa/tank cleaning; plumber/dhara/pipe/leak/chuhiyo -> plumber; bijuli/electrician/light/switch/wiring -> electrician. Null if unclear or not offered.
- optionId: only if they said a size or type (e.g. "8000 litre"). Otherwise null.
- date: aaja/today -> today; bholi/tomorrow -> tomorrow; parsi -> the day after tomorrow; a weekday -> the next such day. Null if not said.
- slot: "aaja nai"/"ahile"/"jati sakdo chito"/urgent/now -> "asap" (and date today). bihana/morning -> "06-09" if before 9 is meant, else "09-12"; diuso/afternoon -> "12-15"; beluka/evening -> "15-18" or "18-21" (choose by the hour if they say one); a clock time -> the window containing it. Null if not said.
- contactName/contactPhone: only if they name someone else or say a number. Never invent them.
- note: details for the supplier (e.g. "kitchen tap leaking", "4th floor"). Empty string if none.
- reply: one short sentence in ${lang === "ne" ? "Nepali (Devanagari)" : "English"}. If something important is missing (service or time), ask for it; otherwise say what you understood.
- understood: false only if the request has nothing to do with booking these services.
Never set prices. Never guess details the customer did not say.`;
}

/** Checks Claude's draft against the real catalog and the 30-day rule, and drops anything that does not fit. */
export function cleanDraft(draft: Draft, services: Service[], clock: ClientClock): Draft {
  const service = services.find((s) => s.key === draft.serviceKey);
  const option = service?.options.find((o) => o.id === draft.optionId);

  let date = draft.date && /^\d{4}-\d{2}-\d{2}$/.test(draft.date) ? draft.date : null;
  if (date) {
    const days = (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${clock.today}T00:00:00Z`)) / 86_400_000;
    if (!(days >= 0 && days <= 30)) date = null;
  }
  let slot: SlotId | null = draft.slot;
  if (slot === "asap" && date && date !== clock.today) slot = null; // "as soon as possible" only means today
  if (slot === "asap" && !date) date = clock.today;

  const phone = (draft.contactPhone ?? "").replace(/\D/g, "").replace(/^977/, "");
  return {
    ...draft,
    serviceKey: service?.key ?? null,
    optionId: option?.id ?? null,
    date,
    slot,
    contactName: draft.contactName?.trim().slice(0, 80) || null,
    contactPhone: phone.length >= 8 && phone.length <= 10 ? phone : null,
    note: draft.note.trim().slice(0, 500),
    reply: draft.reply.trim().slice(0, 300),
  };
}

type ParseClient = Pick<Anthropic["beta"]["messages"], "parse">;

export function createVoiceParser(client: () => ParseClient) {
  return async function parseBookingRequest(
    text: string,
    services: Service[],
    clock: ClientClock,
    lang: "ne" | "en",
  ): Promise<Draft> {
    let response;
    try {
      response = await client().parse({
        model: MODEL,
        max_tokens: 4000,
        // Fast and cheap: this is a short extraction, not hard reasoning.
        output_config: { effort: "low", format: betaZodOutputFormat(DraftSchema) },
        // If the model declines, the API retries on a suitable fallback model inside the same call.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: buildSystemPrompt(services, clock, lang),
        messages: [{ role: "user", content: text }],
      });
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) throw new ApiError(429, "Voice booking is busy. Please try again in a moment.");
      if (error instanceof Anthropic.AuthenticationError) throw new ApiError(503, "Voice booking is not set up yet.");
      if (error instanceof Anthropic.APIError) throw new ApiError(502, "Voice booking is not working right now. Please use the form.");
      throw error;
    }

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      throw new ApiError(422, "Sorry, I could not understand that. Please try again or use the form.");
    }
    return cleanDraft(response.parsed_output, services, clock);
  };
}

let shared: Anthropic | null = null;

/** The real parser. Needs ANTHROPIC_API_KEY on the server. */
export const parseBookingRequest = createVoiceParser(() => {
  if (!process.env.ANTHROPIC_API_KEY) throw new ApiError(503, "Voice booking is not set up yet.");
  shared ??= new Anthropic({ timeout: 20_000, maxRetries: 1 });
  return shared.beta.messages;
});

/** Understands one thing the customer said: Claude when ANTHROPIC_API_KEY is set, otherwise (or if Claude is down) the free word rules. */
async function understandOne(text: string, services: Service[], clock: ClientClock, lang: "ne" | "en"): Promise<Draft> {
  const free = () => parseWithRules(text, services, clock);
  if (!process.env.ANTHROPIC_API_KEY) return free();
  try {
    return await parseBookingRequest(text, services, clock, lang);
  } catch (error) {
    if (error instanceof ApiError && error.status >= 500) return free();
    throw error;
  }
}

/**
 * One turn of the voice conversation: adds what was just said (or tapped) to what was understood before,
 * then returns the next question, or the finished draft for the customer to confirm.
 */
export async function voiceTurn(input: {
  text: string;
  previous: Draft | null;
  choice: { ask: "service" | "date" | "slot"; value: string } | null;
  services: Service[];
  clock: ClientClock;
  lang: "ne" | "en";
}): Promise<VoiceAnswer> {
  const { text, previous, choice, services, clock, lang } = input;
  const said = choice ? choiceAsDraft(choice.ask, choice.value) : await understandOne(text, services, clock, lang);
  const merged = cleanDraft(merge(previous ? cleanDraft(previous, services, clock) : null, said), services, clock);
  return nextStep(merged, services, clock, lang);
}
