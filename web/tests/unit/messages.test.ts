import { describe, expect, it } from "vitest";
import { messages } from "@/server/notifications/messages";

const booking = { id: "b1", serviceNameEn: "Water Tanker", serviceNameNe: "पानी ट्याङ्कर", supplierName: "Hari" };

describe("notification texts", () => {
  const all = [
    messages.newJob({ ...booking, optionLabelEn: "8,000 Liters", optionLabelNe: "८,००० लिटर" }),
    messages.accepted(booking),
    messages.onTheWay(booking),
    messages.completed(booking),
    messages.released(booking),
    messages.cancelled(booking),
  ];

  it("exist in both languages and never print 'undefined'", () => {
    for (const m of all) {
      for (const text of [m.titleEn, m.titleNe, m.bodyEn, m.bodyNe]) {
        expect(text.trim()).not.toBe("");
        expect(text).not.toContain("undefined");
      }
    }
  });

  it("carry the booking id so the app can open it", () => {
    for (const m of all) expect(m.bookingId).toBe("b1");
  });

  it("name the supplier where it matters", () => {
    expect(messages.accepted(booking).bodyEn).toContain("Hari");
    expect(messages.accepted(booking).bodyNe).toContain("Hari");
    expect(messages.onTheWay(booking).bodyEn).toContain("Hari");
  });
});
