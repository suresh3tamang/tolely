import { describe, expect, it, vi } from "vitest";
import { buildSystemPrompt, cleanDraft, createVoiceParser, type Draft } from "@/server/voice/voice.service";
import type { Service } from "@/shared/services";

const services: Service[] = [
  {
    key: "tanker", nameEn: "Water Tanker", nameNe: "पानी ट्याङ्कर", icon: "water_drop", active: true,
    options: [{ id: "6000L", labelEn: "6,000 Liters", labelNe: "६,००० लिटर", price: 2500 }, { id: "8000L", labelEn: "8,000 Liters", labelNe: "८,००० लिटर", price: 3200 }],
  },
  { key: "plumber", nameEn: "Plumber", nameNe: "प्लम्बर", icon: "plumbing", active: true, options: [{ id: "visit", labelEn: "Visit", labelNe: "भ्रमण", price: 500 }] },
];
const clock = { today: "2026-10-09", time: "14:30", weekday: "Friday" };

const draft = (extra: Partial<Draft> = {}): Draft => ({
  understood: true, serviceKey: "plumber", optionId: null, date: "2026-10-09", slot: "asap",
  contactName: null, contactPhone: null, note: "", reply: "प्लम्बर, आज सकेसम्म चाँडो।", ...extra,
});

describe("voice booking prompt", () => {
  it("lists the real services and the customer's own clock", () => {
    const prompt = buildSystemPrompt(services, clock, "ne");
    expect(prompt).toContain('service "plumber"');
    expect(prompt).toContain('option "8000L"');
    expect(prompt).toContain("Friday 2026-10-09");
    expect(prompt).toContain("14:30");
    expect(prompt).toContain("Nepali (Devanagari)");
  });
});

describe("cleaning the draft", () => {
  it("keeps a valid draft as it is", () => {
    expect(cleanDraft(draft(), services, clock)).toMatchObject({ serviceKey: "plumber", date: "2026-10-09", slot: "asap" });
  });

  it("drops a service or option that is not in the catalog", () => {
    expect(cleanDraft(draft({ serviceKey: "spaceship" }), services, clock).serviceKey).toBeNull();
    expect(cleanDraft(draft({ serviceKey: "tanker", optionId: "99L" }), services, clock)).toMatchObject({ serviceKey: "tanker", optionId: null });
    expect(cleanDraft(draft({ serviceKey: "tanker", optionId: "8000L" }), services, clock).optionId).toBe("8000L");
  });

  it("drops dates in the past or more than 30 days away", () => {
    expect(cleanDraft(draft({ date: "2026-10-08", slot: "12-15" }), services, clock).date).toBeNull();
    expect(cleanDraft(draft({ date: "2026-12-25", slot: "12-15" }), services, clock).date).toBeNull();
    expect(cleanDraft(draft({ date: "2026-10-10", slot: "12-15" }), services, clock).date).toBe("2026-10-10");
  });

  it("'as soon as possible' always means today", () => {
    expect(cleanDraft(draft({ date: null }), services, clock).date).toBe("2026-10-09");
    expect(cleanDraft(draft({ date: "2026-10-10" }), services, clock).slot).toBeNull();
  });

  it("keeps only a phone number that looks real", () => {
    expect(cleanDraft(draft({ contactPhone: "+977 981-1122233" }), services, clock).contactPhone).toBe("9811122233");
    expect(cleanDraft(draft({ contactPhone: "12" }), services, clock).contactPhone).toBeNull();
  });
});

describe("parsing a request", () => {
  function fakeClient(result: object) {
    const parse = vi.fn(async () => result);
    return { parse, run: createVoiceParser(() => ({ parse }) as never) };
  }

  it("asks Claude for a structured draft and returns it cleaned", async () => {
    const { parse, run } = fakeClient({ stop_reason: "end_turn", parsed_output: draft({ contactPhone: "9811122233" }) });
    const result = await run("plumber chaiyo aaja nai", services, clock, "ne");

    expect(result).toMatchObject({ serviceKey: "plumber", slot: "asap", contactPhone: "9811122233" });
    const params = (parse.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.messages).toEqual([{ role: "user", content: "plumber chaiyo aaja nai" }]);
    expect(params.fallbacks).toBe("default");
  });

  it("says it could not understand when the model refuses or returns nothing", async () => {
    await expect(fakeClient({ stop_reason: "refusal", parsed_output: null }).run("x x", services, clock, "en")).rejects.toMatchObject({ status: 422 });
    await expect(fakeClient({ stop_reason: "end_turn", parsed_output: null }).run("x x", services, clock, "en")).rejects.toMatchObject({ status: 422 });
  });
});
