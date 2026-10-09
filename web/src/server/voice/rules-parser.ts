import type { SlotId } from "@/shared/schedule";
import type { Service } from "@/shared/services";
import type { ClientClock, Draft } from "./voice.service";

// Free voice booking: understands common requests with word lists, no paid AI needed.
// "plumber chaiyo aaja nai" -> plumber, today, as soon as possible.
// Works with Nepali (Devanagari), Romanized Nepali and English. To teach it a new word, add it below.

/**
 * Words that point to each service. `strong` words are clear on their own; `weak` ones only count when no
 * strong word matched (e.g. "pani" is water, but also means "also": "plumber pani chaiyo").
 * Latin words of 4 letters or fewer must be whole words; longer ones may have a suffix ("plumberlai").
 */
const SERVICE_WORDS: { key: string; strong: string[]; weak: string[] }[] = [
  {
    key: "tank_cleaning",
    strong: ["tank clean", "tanki safa", "tanki sapha", "tank safa", "tanki cleaning", "ट्याङ्की सफा", "ट्यांकी सफा", "टंकी सफा", "ट्याङ्की सफाई", "ट्यांकी सफाई"],
    weak: [],
  },
  {
    key: "tanker",
    strong: ["tanker", "tankar", "paani", "khane pani", "पानी", "ट्याङ्कर", "ट्यांकर", "ट्यान्कर"],
    weak: ["pani", "water", "jal", "litre", "liter", "लिटर"],
  },
  {
    key: "plumber",
    strong: ["plumber", "plumbar", "plamber", "dhara", "pipe", "chuhi", "toilet", "commode", "geyser", "प्लम्बर", "धारा", "पाइप", "चुहि", "चुहा", "ट्वाइलेट"],
    weak: ["leak", "tap", "basin", "bathroom", "बाथरुम"],
  },
  {
    key: "electrician",
    strong: ["electrician", "electric", "bijuli", "wiring", "बिजुली", "इलेक्ट्रिसियन", "करेन्ट", "वायरिङ"],
    weak: ["batti", "light", "switch", "socket", "current", "fan", "mcb", "बत्ती", "स्विच", "पंखा"],
  },
  { key: "shifting", strong: ["shifting", "house shift", "ghar sarne", "saman sarne", "सिफ्टिङ", "घर सर्ने"], weak: ["truck", "सामान"] },
  { key: "home_cleaning", strong: ["home cleaning", "house cleaning", "ghar safa", "ghar sapha", "घर सफा", "सरसफाई"], weak: [] },
];

const ASAP_WORDS = ["aaja nai", "aajai", "aja nai", "ajai", "ahile", "ahilei", "aile", "turuntai", "turuntai", "chito", "chhito", "jaldi", "urgent", "now", "asap", "soon", "आजै", "आज नै", "अहिले", "अहिल्यै", "तुरुन्त", "छिटो", "चाँडो", "जतिसक्दो"];
const TODAY_WORDS = ["aaja", "aja", "today", "आज"];
const TOMORROW_WORDS = ["bholi", "bholli", "voli", "tomorrow", "भोलि", "भोली"];
const DAY_AFTER_WORDS = ["parsi", "parshi", "day after tomorrow", "पर्सि", "पर्सी"];

/** Weekday words; index 0 = Monday (like Date.getUTCDay() shifted). */
const WEEKDAY_WORDS: string[][] = [
  ["monday", "sombar", "sombaar", "सोमबार"],
  ["tuesday", "mangalbar", "mangalbaar", "मंगलबार", "मङ्गलबार"],
  ["wednesday", "budhabar", "budhbar", "बुधबार"],
  ["thursday", "bihibar", "bihibaar", "बिहीबार", "बिहिबार"],
  ["friday", "sukrabar", "shukrabar", "शुक्रबार"],
  ["saturday", "sanibar", "shanibar", "शनिबार"],
  ["sunday", "aaitabar", "aitabar", "आइतबार"],
];

/** Parts of the day -> time window. */
const PART_OF_DAY: { slot: SlotId; words: string[] }[] = [
  { slot: "06-09", words: ["early morning", "sabere", "bihana sabere", "बिहानै", "सबेरै"] },
  { slot: "09-12", words: ["morning", "bihana", "biyana", "बिहान"] },
  { slot: "12-15", words: ["afternoon", "diuso", "diuso", "noon", "lunch", "दिउँसो", "दिउसो"] },
  { slot: "15-18", words: ["evening", "beluka", "belka", "saanjh", "बेलुका", "बेलुकी", "साँझ"] },
  { slot: "18-21", words: ["night", "raati", "rati", "राति", "रात"] },
];

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

/** Lower case, Nepali digits -> 0-9, punctuation -> spaces. */
export function normalize(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)))
    .replace(/[.,!?।"'“”‘’()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

/** True if any of the words appears in the (normalized) text. */
function has(text: string, words: string[]): boolean {
  return words.some((w) => {
    if (!/^[a-z0-9 ]+$/.test(w)) return text.includes(w); // Devanagari: plain search
    return w.length <= 4 ? text.includes(` ${w} `) : text.includes(` ${w}`);
  });
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function findService(text: string, services: Service[]): Service | undefined {
  const offered = (key: string) => services.find((s) => s.key === key);
  for (const strength of ["strong", "weak"] as const) {
    for (const entry of SERVICE_WORDS) {
      const service = offered(entry.key);
      if (service && has(text, entry[strength])) return service;
    }
  }
  // Also the names from the catalog, so a new service works without code changes.
  return services.find((s) => text.includes(` ${s.nameEn.toLowerCase()}`) || text.includes(s.nameNe));
}

/** "8000 litre", "8 hajar", "८ हजार" -> the option whose label has that number. */
function findOption(text: string, service: Service): string | null {
  const numbers: number[] = [];
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*(hajar|hazar|हजार|thousand|k\b)/g)) numbers.push(Math.round(Number(m[1]) * 1000));
  for (const m of text.matchAll(/\d[\d,]*/g)) numbers.push(Number(m[0].replace(/,/g, "")));
  for (const n of numbers) {
    const option = service.options.find((o) => Number((o.labelEn.match(/[\d,]+/)?.[0] ?? "").replace(/,/g, "")) === n);
    if (option) return option.id;
  }
  return null;
}

function findDate(text: string, clock: ClientClock): string | null {
  if (has(text, DAY_AFTER_WORDS)) return addDays(clock.today, 2);
  if (has(text, TOMORROW_WORDS)) return addDays(clock.today, 1);
  if (has(text, TODAY_WORDS) || has(text, ASAP_WORDS)) return clock.today;
  const todayIndex = (new Date(`${clock.today}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const wanted = WEEKDAY_WORDS.findIndex((words) => has(text, words));
  if (wanted >= 0) return addDays(clock.today, ((wanted - todayIndex + 7) % 7) || 7);
  return null;
}

/** "3 baje", "4 pm", "beluka 5 baje" -> the hour of the day, if said. */
function findHour(text: string): number | null {
  const m = text.match(/(\d{1,2})\s*(?::\d{2}\s*)?(baje|बजे|o clock|am|pm|bajey|bje)/);
  if (!m) return null;
  let hour = Number(m[1]);
  const afternoon = m[2] === "pm" || has(text, ["beluka", "diuso", "evening", "afternoon", "बेलुका", "दिउँसो", "राति", "raati"]);
  if (afternoon && hour < 12) hour += 12;
  if (!afternoon && m[2] !== "am" && hour >= 1 && hour <= 6) hour += 12; // "3 baje" usually means 3 PM
  return hour;
}

const WINDOWS: { id: SlotId; from: number; to: number }[] = [
  { id: "06-09", from: 6, to: 9 },
  { id: "09-12", from: 9, to: 12 },
  { id: "12-15", from: 12, to: 15 },
  { id: "15-18", from: 15, to: 18 },
  { id: "18-21", from: 18, to: 21 },
];

function findSlot(text: string, date: string | null, clock: ClientClock): SlotId | null {
  const hour = findHour(text);
  if (hour !== null) return WINDOWS.find((w) => hour >= w.from && hour < w.to)?.id ?? null;
  const part = PART_OF_DAY.find((p) => has(text, p.words));
  if (part) return part.slot;
  if (has(text, ASAP_WORDS) && (!date || date === clock.today)) return "asap";
  return null;
}

/** A 10-digit Nepal mobile number (98..., 97...) or an 8-9 digit landline, if said. */
function findPhone(text: string): string | null {
  const digits = text.replace(/(\d)[\s-](?=\d)/g, "$1").match(/(?:\+?977)?(9[78]\d{8}|0?1\d{7})/);
  return digits ? digits[1] : null;
}

/** Understands one thing the customer said, with word lists. Only what was actually said is filled in. */
export function parseWithRules(said: string, services: Service[], clock: ClientClock): Draft {
  const text = normalize(said);
  const service = findService(text, services);
  const date = findDate(text, clock);
  return {
    understood: true,
    serviceKey: service?.key ?? null,
    optionId: service ? findOption(text, service) : null,
    date,
    slot: findSlot(text, date, clock),
    contactName: null,
    contactPhone: findPhone(text),
    note: "",
    reply: "",
  };
}
