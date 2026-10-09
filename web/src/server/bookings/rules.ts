import type { BookingStatus } from "@/shared/types";

// Pure business rules for bookings: no database, easy to test.

/**
 * Which statuses the assigned supplier may move a booking to, from each status.
 * `accepted → pending` means the supplier releases the job for someone else.
 */
export const SUPPLIER_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  accepted: ["on_the_way", "pending"],
  on_the_way: ["completed"],
};

/** A customer may cancel until the supplier is on the way. */
export const CUSTOMER_CANCELLABLE: BookingStatus[] = ["pending", "accepted"];

/** An admin may cancel anything that isn't finished. */
export const ADMIN_CANCELLABLE: BookingStatus[] = ["pending", "accepted", "on_the_way"];

export const OPEN_STATUSES: BookingStatus[] = ["pending", "accepted", "on_the_way"];

export function canSupplierChange(from: BookingStatus, to: BookingStatus): boolean {
  return SUPPLIER_TRANSITIONS[from]?.includes(to) ?? false;
}

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Bookings may start up to 15 minutes in the past (slow forms) and 30 days ahead. */
export function isAcceptableBookingTime(whenMs: number, nowMs: number): boolean {
  return whenMs >= nowMs - 15 * MINUTE_MS && whenMs <= nowMs + 30 * DAY_MS;
}

const MAX_WINDOW_MS = 12 * 60 * MINUTE_MS;

/**
 * A booking may be for a time window (start to end). The window must be a sensible length and must not be
 * over already; without an end, the single start time follows `isAcceptableBookingTime`.
 */
export function isAcceptableBookingWindow(startMs: number, endMs: number | null, nowMs: number): boolean {
  if (endMs === null) return isAcceptableBookingTime(startMs, nowMs);
  return endMs > startMs && endMs - startMs <= MAX_WINDOW_MS && endMs > nowMs && startMs <= nowMs + 30 * DAY_MS;
}
