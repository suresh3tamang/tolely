import { describe, expect, it } from "vitest";
import { merge, nextStep } from "@/server/voice/conversation";
import { parseWithRules } from "@/server/voice/rules-parser";
import { voiceTurn } from "@/server/voice/voice.service";
import type { Service } from "@/shared/services";

const svc = (key: string, nameEn: string, nameNe: string, options: [string, string, number][]): Service => ({
  key, nameEn, nameNe, icon: "x", active: true,
  options: options.map(([id, labelEn, price]) => ({ id, labelEn, labelNe: labelEn, price })),
});
const services = [
  svc("tanker", "Water Tanker", "पानी ट्याङ्कर", [["6000L", "6,000 Liters", 2500], ["8000L", "8,000 Liters", 3200], ["12000L", "12,000 Liters", 4500]]),
  svc("tank_cleaning", "Tank Cleaning", "ट्याङ्की सफाई", [["small", "Up to 1000 L", 1500]]),
  svc("plumber", "Plumber", "प्लम्बर", [["visit", "Visit", 500]]),
  svc("electrician", "Electrician", "इलेक्ट्रिसियन", [["visit", "Visit", 500]]),
];
// Friday 9 October 2026, 2:30 PM in Kathmandu
const clock = { today: "2026-10-09", time: "14:30", weekday: "Friday" };
const parse = (text: string) => parseWithRules(text, services, clock);

describe("free voice rules", () => {
  it.each([
    ["plumber chaiyo aaja nai", "plumber", "2026-10-09", "asap"],
    ["प्लम्बर चाहियो आजै", "plumber", "2026-10-09", "asap"],
    ["dhara chuhiyo ahile aaunus", "plumber", "2026-10-09", "asap"],
    ["bholi bihana 8000 litre pani pathaunu", "tanker", "2026-10-10", "09-12"],
    ["भोलि बिहान ८००० लिटर पानी", "tanker", "2026-10-10", "09-12"],
    ["tanki safa garnu paryo parsi", "tank_cleaning", "2026-10-11", null],
    ["bijuli ko kaam aaja beluka", "electrician", "2026-10-09", "15-18"],
    ["need an electrician tomorrow at 4 pm", "electrician", "2026-10-10", "15-18"],
    ["water tanker on sunday afternoon", "tanker", "2026-10-11", "12-15"],
    ["plumber chaiyo sombar 10 baje", "plumber", "2026-10-12", "09-12"],
  ])("%s", (text, service, date, slot) => {
    const d = parse(text);
    expect(d.serviceKey).toBe(service);
    expect(d.date).toBe(date);
    expect(d.slot).toBe(slot);
  });

  it("picks the size that was said", () => {
    expect(parse("8000 litre tanker").optionId).toBe("8000L");
    expect(parse("12 hajar liter pani bholi").optionId).toBe("12000L");
    expect(parse("tanker bholi").optionId).toBeNull();
  });

  it("does not mistake 'pani' (also) for water when another service is named", () => {
    expect(parse("plumber pani chaiyo aaja").serviceKey).toBe("plumber");
  });

  it("does not match short words inside other words", () => {
    // "tapai" (you) must not be read as "tap"
    expect(parse("tapai aaunus").serviceKey).toBeNull();
  });

  it("finds a phone number that was said", () => {
    expect(parse("plumber bholi, call 981 112 2233").contactPhone).toBe("9811122233");
  });
});

describe("voice conversation", () => {
  const turn = (text: string, previous: Awaited<ReturnType<typeof voiceTurn>> | null = null, lang: "ne" | "en" = "en") =>
    voiceTurn({ text, previous, choice: null, services, clock, lang });

  it("asks for the day, then the time, then is ready to confirm", async () => {
    const first = await turn("plumber chaiyo");
    expect(first).toMatchObject({ serviceKey: "plumber", ask: "date", reply: "Plumber: which day do you need it?" });
    expect(first.choices.map((c) => c.label)).toEqual(["Today", "Tomorrow", "The day after tomorrow"]);

    const second = await turn("bholi", first);
    expect(second).toMatchObject({ serviceKey: "plumber", date: "2026-10-10", ask: "slot", reply: "What time tomorrow?" });
    expect(second.choices.map((c) => c.value)).toEqual(["06-09", "09-12", "12-15", "15-18", "18-21"]);

    const third = await turn("3 baje", second);
    expect(third).toMatchObject({ serviceKey: "plumber", date: "2026-10-10", slot: "15-18", ask: null });
    expect(third.reply).toBe("Plumber, tomorrow, 3–6 pm. Please check and confirm.");
  });

  it("asks in Nepali for Nepali speakers", async () => {
    const first = await turn("प्लम्बर चाहियो", null, "ne");
    expect(first.reply).toBe("प्लम्बर, कुन दिन चाहियो?");
    const second = await turn("आज", first, "ne");
    expect(second.reply).toBe("आज कति बजे चाहियो?");
  });

  it("asks which service first when none was recognised", async () => {
    const d = await turn("kei chaiyo");
    expect(d).toMatchObject({ understood: false, ask: "service", reply: "Which service do you need?" });
    expect(d.choices.map((c) => c.value)).toContain("plumber");
  });

  it("is done in one go when everything was said", async () => {
    expect(await turn("plumber chaiyo aaja nai")).toMatchObject({ date: "2026-10-09", slot: "asap", ask: null });
  });

  it("only offers today's windows that are still open, and says when a time has passed", async () => {
    const today = await turn("plumber aaja");
    expect(today.choices.map((c) => c.value)).toEqual(["asap", "15-18", "18-21"]); // it is 2:30 PM
    const tooLate = await turn("bihana", today);
    expect(tooLate).toMatchObject({ slot: null, ask: "slot", reply: "That time has passed. What time today?" });
  });

  it("accepts a tapped choice instead of words", async () => {
    const first = await turn("tanker chaiyo");
    const second = await voiceTurn({ text: "", previous: first, choice: { ask: "date", value: "2026-10-11" }, services, clock, lang: "en" });
    expect(second).toMatchObject({ serviceKey: "tanker", date: "2026-10-11", ask: "slot" });
  });

  it("a new day clears the time chosen for another day; a new service clears the size", () => {
    const before = { ...parseWithRules("8000 litre tanker bholi bihana", services, clock) };
    expect(merge(before, parseWithRules("parsi", services, clock))).toMatchObject({ date: "2026-10-11", slot: null, optionId: "8000L" });
    expect(merge(before, parseWithRules("plumber", services, clock))).toMatchObject({ serviceKey: "plumber", optionId: null });
  });

  it("does not offer today when nothing is left of it", () => {
    const late = { ...clock, time: "21:30" };
    const d = nextStep(parseWithRules("plumber", services, late), services, late, "en");
    expect(d.choices.map((c) => c.label)).toEqual(["Today", "Tomorrow", "The day after tomorrow"]); // "as soon as possible" is still open today
  });
});
