import { describe, expect, it } from "vitest";
import { formatDay, formatShortDateTime, formatTime, formatWindow, weekdayName } from "@/shared/dates";

const friday = new Date(2026, 9, 9, 14, 5); // Friday 9 October 2026, 2:05 PM

describe("dates in Nepali and English", () => {
  it("weekday names", () => {
    expect(weekdayName(friday, "ne")).toBe("शुक्रबार");
    expect(weekdayName(friday, "en")).toBe("Friday");
    expect(weekdayName(new Date(2026, 9, 11), "ne")).toBe("आइतबार");
  });

  it("days", () => {
    expect(formatDay(friday, "ne")).toBe("शुक्रबार, 9 अक्टोबर");
    expect(formatDay(friday, "ne", { long: true })).toBe("शुक्रबार, 9 अक्टोबर");
    expect(formatDay(friday, "en")).toBe("Fri, 9 Oct");
    expect(formatDay(new Date("2026-10-11T00:00:00Z"), "ne", { long: true, utc: true })).toBe("आइतबार, 11 अक्टोबर");
  });

  it("times say the part of the day in Nepali", () => {
    expect(formatTime(friday, "ne")).toBe("दिउँसो 2:05");
    expect(formatTime(new Date(2026, 9, 9, 7, 30), "ne")).toBe("बिहान 7:30");
    expect(formatTime(new Date(2026, 9, 9, 17, 0), "ne")).toBe("बेलुका 5:00");
    expect(formatTime(new Date(2026, 9, 9, 20, 0), "ne")).toBe("राति 8:00");
    expect(formatTime(friday, "en")).toBe("2:05 PM");
  });

  it("windows and short date-times", () => {
    expect(formatWindow(new Date(2026, 9, 9, 12), new Date(2026, 9, 9, 15), "ne")).toBe("शुक्रबार, 9 अक्टोबर, दिउँसो 12:00 – दिउँसो 3:00");
    expect(formatWindow(new Date(2026, 9, 9, 12), null, "en")).toBe("Fri, 9 Oct, 12:00 PM");
    expect(formatShortDateTime(friday, "ne")).toBe("9 अक्टोबर, दिउँसो 2:05");
  });
});
