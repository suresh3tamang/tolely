import { describe, expect, it } from "vitest";
import { CreateBookingSchema, RateSchema, ReportSchema, StatusSchema } from "@/server/bookings/schemas";
import { ServiceSchema } from "@/server/catalog/schemas";
import { CustomerProfileSchema, LanguageSchema } from "@/server/profiles/schemas";
import { SupplierSchema } from "@/server/suppliers/schemas";
import { LatLngSchema } from "@/shared/geo";

const booking = {
  serviceKey: "tanker",
  optionId: "8000L",
  address: "Balkot, Bhaktapur",
  scheduledFor: "2026-10-09T06:00:00.000Z",
};

describe("booking input", () => {
  it("fills in defaults", () => {
    const parsed = CreateBookingSchema.parse(booking);
    expect(parsed.paymentMethod).toBe("cash");
    expect(parsed.landmark).toBe("");
    expect(parsed.location).toBeNull();
  });

  it("ignores a price sent by the app (the server decides prices)", () => {
    const parsed = CreateBookingSchema.parse({ ...booking, price: 1 });
    expect("price" in parsed).toBe(false);
  });

  it("rejects a too-short address and a bad time", () => {
    expect(CreateBookingSchema.safeParse({ ...booking, address: "ab" }).success).toBe(false);
    expect(CreateBookingSchema.safeParse({ ...booking, scheduledFor: "tomorrow" }).success).toBe(false);
  });

  it("accepts a map pin in Nepal and rejects one elsewhere", () => {
    expect(CreateBookingSchema.safeParse({ ...booking, location: { lat: 27.7, lng: 85.3 } }).success).toBe(true);
    expect(CreateBookingSchema.safeParse({ ...booking, location: { lat: 37.77, lng: -122.4 } }).success).toBe(false);
  });
});

describe("other inputs", () => {
  it("rating must be a whole number from 1 to 5", () => {
    expect(RateSchema.safeParse({ rating: 5 }).success).toBe(true);
    for (const rating of [0, 6, 3.5, "5"]) expect(RateSchema.safeParse({ rating }).success).toBe(false);
  });

  it("problem reports need a real description", () => {
    expect(ReportSchema.safeParse({ message: "hi" }).success).toBe(false);
    expect(ReportSchema.safeParse({ message: "Supplier never came" }).success).toBe(true);
  });

  it("suppliers can only set safe statuses", () => {
    expect(StatusSchema.safeParse({ status: "completed" }).success).toBe(true);
    expect(StatusSchema.safeParse({ status: "accepted" }).success).toBe(false);
    expect(StatusSchema.safeParse({ status: "cancelled" }).success).toBe(false);
  });

  it("languages are limited to the supported ones", () => {
    expect(LanguageSchema.safeParse({ language: "ne" }).success).toBe(true);
    expect(LanguageSchema.safeParse({ language: "fr" }).success).toBe(false);
    expect(CustomerProfileSchema.parse({ name: "Suresh", address: "Balkot" }).language).toBe("ne");
  });

  it("supplier registration needs at least one service", () => {
    const base = { name: "Hari", area: "Baneshwor" };
    expect(SupplierSchema.safeParse({ ...base, services: [] }).success).toBe(false);
    expect(SupplierSchema.safeParse({ ...base, services: ["plumber"] }).success).toBe(true);
  });

  it("coordinates must be inside Nepal", () => {
    expect(LatLngSchema.safeParse({ lat: 27.7172, lng: 85.324 }).success).toBe(true);
    expect(LatLngSchema.safeParse({ lat: 0, lng: 0 }).success).toBe(false);
  });
});

describe("admin service editor input", () => {
  const service = {
    nameEn: "AC Repair",
    nameNe: "एसी मर्मत",
    icon: "ac_unit",
    active: true,
    options: [{ id: "visit", labelEn: "Visit", labelNe: "भ्रमण", price: 500 }],
  };

  it("accepts a valid service", () => {
    expect(ServiceSchema.safeParse(service).success).toBe(true);
  });

  it("rejects duplicate option ids, negative prices and unknown icons", () => {
    const dup = { ...service, options: [service.options[0], service.options[0]] };
    expect(ServiceSchema.safeParse(dup).success).toBe(false);
    expect(ServiceSchema.safeParse({ ...service, options: [{ ...service.options[0], price: -5 }] }).success).toBe(false);
    expect(ServiceSchema.safeParse({ ...service, icon: "rocket" }).success).toBe(false);
  });
});
