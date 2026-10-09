import { formatDay } from "@/shared/dates";
import { availableSlots, type SlotId } from "@/shared/schedule";
import type { Service } from "@/shared/services";
import type { ClientClock, Draft } from "./voice.service";

// Voice booking as a short conversation:
//   "plumber chaiyo"  -> "Which day?"   -> "bholi"  -> "What time?"  -> "3 baje"  -> "Plumber, tomorrow, 3-6 PM. Confirm?"
// Each answer is merged into what was understood before, and the next missing thing is asked.

/** What to ask next: the service, then the day, then the time. Null when the booking is complete. */
export type Ask = "service" | "date" | "slot" | null;

export type VoiceAnswer = Draft & {
  ask: Ask;
  /** Choices to tap for the question, e.g. today/tomorrow or the time windows still open. */
  choices: { label: string; value: string }[];
};

const EMPTY: Draft = {
  understood: true, serviceKey: null, optionId: null, date: null, slot: null,
  contactName: null, contactPhone: null, note: "", reply: "",
};

/** Adds what was just said to what was understood before. New answers win; a new service resets the size. */
export function merge(previous: Draft | null, next: Draft): Draft {
  const before = previous ?? EMPTY;
  const serviceChanged = !!next.serviceKey && next.serviceKey !== before.serviceKey;
  return {
    understood: true,
    serviceKey: next.serviceKey ?? before.serviceKey,
    optionId: next.optionId ?? (serviceChanged ? null : before.optionId),
    date: next.date ?? before.date,
    slot: next.slot ?? (next.date && next.date !== before.date ? null : before.slot),
    contactName: next.contactName ?? before.contactName,
    contactPhone: next.contactPhone ?? before.contactPhone,
    note: [before.note, next.note].filter(Boolean).join("\n"),
    reply: "",
  };
}

/** The customer's clock as a Date on this server, so the shared schedule rules apply to their day. */
function clockTime(clock: ClientClock): number {
  const [y, m, d] = clock.today.split("-").map(Number);
  const [hh, mm] = clock.time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const SLOT_TEXT: Record<SlotId, { en: string; ne: string }> = {
  asap: { en: "As soon as possible", ne: "सकेसम्म चाँडो" },
  "06-09": { en: "6–9 AM", ne: "बिहान ६–९" },
  "09-12": { en: "9 AM–12 PM", ne: "बिहान ९–१२" },
  "12-15": { en: "12–3 PM", ne: "दिउँसो १२–३" },
  "15-18": { en: "3–6 PM", ne: "बेलुका ३–६" },
  "18-21": { en: "6–9 PM", ne: "बेलुका ६–९" },
};

function dayText(date: string, clock: ClientClock, lang: "ne" | "en"): string {
  if (date === clock.today) return lang === "ne" ? "आज" : "today";
  if (date === addDays(clock.today, 1)) return lang === "ne" ? "भोलि" : "tomorrow";
  if (date === addDays(clock.today, 2)) return lang === "ne" ? "पर्सि" : "the day after tomorrow";
  return formatDay(new Date(`${date}T00:00:00Z`), lang, { long: true, utc: true });
}

/** Checks the merged draft, works out what is still missing, and words the next question. */
export function nextStep(draft: Draft, services: Service[], clock: ClientClock, lang: "ne" | "en"): VoiceAnswer {
  const ne = lang === "ne";
  const service = services.find((s) => s.key === draft.serviceKey);
  const now = clockTime(clock);
  let { date, slot } = draft;
  if (slot === "asap" && !date) date = clock.today;
  if (slot === "asap" && date !== clock.today) slot = null; // "as soon as possible" only means today
  const open = date ? availableSlots(date, now) : [];
  const passed = !!(date && slot && !open.includes(slot)); // e.g. "this morning" asked in the afternoon
  if (passed) slot = null;

  const result = { ...draft, date, slot, understood: !!service };
  const name = service ? (ne ? service.nameNe : service.nameEn) : "";

  if (!service) {
    return {
      ...result,
      ask: "service",
      reply: ne ? "कुन सेवा चाहियो?" : "Which service do you need?",
      choices: services.map((s) => ({ label: ne ? s.nameNe : s.nameEn, value: s.key })),
    };
  }
  if (!date) {
    const days = [0, 1, 2].map((n) => addDays(clock.today, n)).filter((d) => availableSlots(d, now).length);
    return {
      ...result,
      ask: "date",
      reply: ne ? `${name}, कुन दिन चाहियो?` : `${name}: which day do you need it?`,
      choices: days.map((d) => ({ label: capitalize(dayText(d, clock, lang)), value: d })),
    };
  }
  if (!slot) {
    const day = dayText(date, clock, lang);
    const reply = passed
      ? ne ? `त्यो समय बितिसक्यो। ${day} कति बजे चाहियो?` : `That time has passed. What time ${day}?`
      : ne ? `${day} कति बजे चाहियो?` : `What time ${day}?`;
    return { ...result, ask: "slot", reply, choices: open.map((id) => ({ label: SLOT_TEXT[id][lang], value: id })) };
  }
  const when = `${dayText(date, clock, lang)}, ${SLOT_TEXT[slot][lang].toLowerCase()}`;
  return {
    ...result,
    ask: null,
    reply: ne ? `${name}, ${when}। जाँचेर पक्का गर्नुहोस्।` : `${name}, ${when}. Please check and confirm.`,
    choices: [],
  };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Applies a tapped choice (a service key, a date or a time window) as if it had been said. */
export function choiceAsDraft(ask: Exclude<Ask, null>, value: string): Draft {
  if (ask === "service") return { ...EMPTY, serviceKey: value };
  if (ask === "date") return { ...EMPTY, date: /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null };
  const slots: SlotId[] = ["asap", "06-09", "09-12", "12-15", "15-18", "18-21"];
  return { ...EMPTY, slot: slots.includes(value as SlotId) ? (value as SlotId) : null };
}
