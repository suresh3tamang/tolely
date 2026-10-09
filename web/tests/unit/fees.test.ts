import { describe, expect, it } from "vitest";
import { computeEarning, computeFee } from "@/server/bookings/fees";
import { MAX_FEE_PERCENT, SettingsSchema } from "@/server/settings/schemas";
import { SettlementSchema } from "@/server/suppliers/schemas";

describe("platform fee", () => {
  it("is zero when the fee is off", () => {
    expect(computeFee(3200, 0)).toBe(0);
    expect(computeEarning(3200, 0)).toBe(3200);
  });

  it("is a percentage of the price, in whole rupees", () => {
    expect(computeFee(3200, 8)).toBe(256);
    expect(computeEarning(3200, 8)).toBe(2944);
    expect(computeFee(500, 10)).toBe(50);
  });

  it("rounds to the nearest rupee, and fee + earning always equal the price", () => {
    expect(computeFee(2500, 7.5)).toBe(188); // 187.5
    expect(computeFee(1500, 8.5)).toBe(128); // 127.5
    for (const price of [500, 1200, 1500, 2500, 3200, 4500, 8000]) {
      for (const percent of [0, 0.5, 5, 7.5, 8, 10, 12.5, 30]) {
        expect(computeFee(price, percent) + computeEarning(price, percent), `${price} @ ${percent}%`).toBe(price);
      }
    }
  });

  it("never goes below zero or above the price", () => {
    expect(computeFee(-100, 10)).toBe(0);
    expect(computeFee(3200, -5)).toBe(0);
    expect(computeFee(3200, 30)).toBeLessThanOrEqual(3200);
  });
});

describe("settings input", () => {
  it("accepts a sensible fee", () => {
    for (const platformFeePercent of [0, 5, 7.5, MAX_FEE_PERCENT]) {
      expect(SettingsSchema.safeParse({ platformFeePercent }).success, String(platformFeePercent)).toBe(true);
    }
  });

  it("rejects a typo like 80%, negatives and odd steps", () => {
    for (const platformFeePercent of [80, 30.5, -1, 7.3, "8"]) {
      expect(SettingsSchema.safeParse({ platformFeePercent }).success, String(platformFeePercent)).toBe(false);
    }
  });
});

describe("settlement input", () => {
  it("needs a positive whole number of rupees", () => {
    expect(SettlementSchema.safeParse({ amount: 500 }).success).toBe(true);
    for (const amount of [0, -5, 10.5, "500"]) {
      expect(SettlementSchema.safeParse({ amount }).success, String(amount)).toBe(false);
    }
  });
});
