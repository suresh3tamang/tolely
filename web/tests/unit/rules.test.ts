import { describe, expect, it } from "vitest";
import {
  ADMIN_CANCELLABLE,
  CUSTOMER_CANCELLABLE,
  canSupplierChange,
  isAcceptableBookingTime,
} from "@/server/bookings/rules";

describe("supplier status changes", () => {
  it("lets a supplier move an accepted job forward or release it", () => {
    expect(canSupplierChange("accepted", "on_the_way")).toBe(true);
    expect(canSupplierChange("accepted", "pending")).toBe(true);
  });

  it("lets a supplier finish a job they are driving to", () => {
    expect(canSupplierChange("on_the_way", "completed")).toBe(true);
  });

  it("does not allow skipping steps or going backwards", () => {
    expect(canSupplierChange("accepted", "completed")).toBe(false);
    expect(canSupplierChange("on_the_way", "pending")).toBe(false);
    expect(canSupplierChange("pending", "on_the_way")).toBe(false);
  });

  it("does not allow changing finished bookings", () => {
    expect(canSupplierChange("completed", "pending")).toBe(false);
    expect(canSupplierChange("cancelled", "accepted" as never)).toBe(false);
  });
});

describe("cancelling", () => {
  it("customers can cancel until the supplier is on the way", () => {
    expect(CUSTOMER_CANCELLABLE).toEqual(["pending", "accepted"]);
  });

  it("admins can cancel anything that isn't finished", () => {
    expect(ADMIN_CANCELLABLE).toEqual(["pending", "accepted", "on_the_way"]);
  });
});

describe("booking time window", () => {
  const now = Date.UTC(2026, 9, 9, 6, 0);
  const minute = 60_000;
  const day = 24 * 60 * minute;

  it("accepts a time soon and a time up to 30 days ahead", () => {
    expect(isAcceptableBookingTime(now + 2 * 60 * minute, now)).toBe(true);
    expect(isAcceptableBookingTime(now + 30 * day, now)).toBe(true);
  });

  it("forgives a form that took a few minutes to fill in", () => {
    expect(isAcceptableBookingTime(now - 10 * minute, now)).toBe(true);
  });

  it("rejects the past and the far future", () => {
    expect(isAcceptableBookingTime(now - 20 * minute, now)).toBe(false);
    expect(isAcceptableBookingTime(now + 31 * day, now)).toBe(false);
  });
});
