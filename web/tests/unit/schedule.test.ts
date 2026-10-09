import { describe, expect, it } from "vitest";
import { availableSlots, dayKey, lastBookableDay, nextDays, slotLabel, windowFor } from "@/shared/schedule";

const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min).getTime();

describe("booking time windows", () => {
  const morning = at(2026, 10, 9, 7); // 7:00 on the 9th

  it("lists today, tomorrow and the day after", () => {
    expect(nextDays(morning)).toEqual(["2026-10-09", "2026-10-10", "2026-10-11"]);
  });

  it("offers every window tomorrow, but not 'as soon as possible'", () => {
    expect(availableSlots("2026-10-10", morning)).toEqual(["06-09", "09-12", "12-15", "15-18", "18-21"]);
  });

  it("offers today's windows that still have time left, plus 'as soon as possible'", () => {
    expect(availableSlots("2026-10-09", at(2026, 10, 9, 13))).toEqual(["asap", "12-15", "15-18", "18-21"]);
    // 2:30 pm: only 30 minutes of the 12-3 window remain, so it is not offered
    expect(availableSlots("2026-10-09", at(2026, 10, 9, 14, 30))).toEqual(["asap", "15-18", "18-21"]);
  });

  it("offers only 'as soon as possible' late in the evening, and no windows after 9 pm", () => {
    expect(availableSlots("2026-10-09", at(2026, 10, 9, 21, 30))).toEqual(["asap"]);
  });

  it("gives the exact start and end of a window", () => {
    const w = windowFor("2026-10-10", "12-15", morning)!;
    expect(w.start.getTime()).toBe(at(2026, 10, 10, 12));
    expect(w.end.getTime()).toBe(at(2026, 10, 10, 15));
  });

  it("'as soon as possible' starts now and lasts three hours", () => {
    const w = windowFor("2026-10-09", "asap", morning)!;
    expect(w.start.getTime()).toBe(morning);
    expect(w.end.getTime() - w.start.getTime()).toBe(3 * 3_600_000);
  });

  it("refuses windows that are over, or more than 30 days away", () => {
    expect(windowFor("2026-10-09", "06-09", at(2026, 10, 9, 10))).toBeNull();
    expect(windowFor("2026-10-09", "asap", at(2026, 10, 10, 10))).toBeNull();
    expect(windowFor(lastBookableDay(morning), "12-15", morning)).not.toBeNull();
    expect(windowFor("2026-12-25", "12-15", morning)).toBeNull();
  });

  it("labels windows like people say them", () => {
    expect(slotLabel("12-15", "Soon")).toBe("12 PM – 3 PM");
    expect(slotLabel("06-09", "Soon")).toBe("6 AM – 9 AM");
    expect(slotLabel("asap", "Soon")).toBe("Soon");
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
