// Choosing "when": a day (today, tomorrow, ...) and a time window (12 pm to 3 pm).
// Pure functions, so the rules are easy to test. Times are in the customer's own time zone.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export type SlotId = "asap" | "06-09" | "09-12" | "12-15" | "15-18" | "18-21";

export const SLOTS: { id: Exclude<SlotId, "asap">; from: number; to: number }[] = [
  { id: "06-09", from: 6, to: 9 },
  { id: "09-12", from: 9, to: 12 },
  { id: "12-15", from: 12, to: 15 },
  { id: "15-18", from: 15, to: 18 },
  { id: "18-21", from: 18, to: 21 },
];

/** A slot is offered if at least this much of it is still ahead. */
const MIN_LEFT = 45 * MINUTE;
export const ASAP_WINDOW = 3 * HOUR;
export const BOOK_AHEAD_DAYS = 30;

/** The day as "2026-10-09" in local time (what an <input type="date"> uses). */
export function dayKey(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function at(day: string, hour: number): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour, 0, 0, 0).getTime();
}

export function isToday(day: string, now: number): boolean {
  return day === dayKey(new Date(now));
}

/** "today", "tomorrow", then the next days, as day keys. */
export function nextDays(now: number, count = 3): string[] {
  const start = new Date(now);
  return Array.from({ length: count }, (_, i) => dayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
}

export function lastBookableDay(now: number): string {
  const d = new Date(now);
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + BOOK_AHEAD_DAYS));
}

/** Which windows can still be booked on this day. "As soon as possible" is only offered today. */
export function availableSlots(day: string, now: number): SlotId[] {
  const slots = SLOTS.filter((s) => at(day, s.to) - Math.max(at(day, s.from), now) >= MIN_LEFT).map((s) => s.id);
  return isToday(day, now) ? ["asap", ...slots] : slots;
}

/** The start and end of the chosen window, or null if it can't be booked. */
export function windowFor(day: string, slot: SlotId, now: number): { start: Date; end: Date } | null {
  if (!day || day > lastBookableDay(now) || !availableSlots(day, now).includes(slot)) return null;
  if (slot === "asap") return { start: new Date(now), end: new Date(now + ASAP_WINDOW) };
  const s = SLOTS.find((x) => x.id === slot)!;
  return { start: new Date(at(day, s.from)), end: new Date(at(day, s.to)) };
}

/** 12 -> "12 PM", 15 -> "3 PM". */
export function hourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? "AM" : "PM"}`;
}

export function slotLabel(id: SlotId, soon: string): string {
  if (id === "asap") return soon;
  const s = SLOTS.find((x) => x.id === id)!;
  return `${hourLabel(s.from)} – ${hourLabel(s.to)}`;
}
