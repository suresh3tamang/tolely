import { Timestamp } from "firebase-admin/firestore";
import { revalidateTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadOverview, resolveComplaint } from "@/server/admin/admin.service";
import { findOption, loadCatalog, saveService } from "@/server/catalog/catalog.service";
import { ServiceSchema } from "@/server/catalog/schemas";
import { complaints } from "@/server/collections";
import { DEFAULT_SERVICES } from "@/shared/services";
import { caller, read, resetDb, seedBooking, seedSupplier } from "../helpers/db";

const acRepair = ServiceSchema.parse({
  nameEn: "AC Repair",
  nameNe: "एसी मर्मत",
  icon: "ac_unit",
  active: true,
  options: [{ id: "visit", labelEn: "Visit", labelNe: "भ्रमण", price: 700 }],
});

beforeEach(async () => {
  await resetDb();
  vi.mocked(revalidateTag).mockClear();
});

describe("service catalog", () => {
  it("uses the built-in services until an admin edits something", async () => {
    expect((await loadCatalog()).map((s) => s.key)).toEqual(DEFAULT_SERVICES.map((s) => s.key));
  });

  it("the first edit keeps all the other services", async () => {
    await saveService("ac_repair", acRepair);

    const keys = (await loadCatalog()).map((s) => s.key);
    expect(keys).toEqual([...DEFAULT_SERVICES.map((s) => s.key), "ac_repair"]); // new service goes last
    expect(revalidateTag).toHaveBeenCalledWith("services", "max");
  });

  it("changing a price keeps the service's place in the list", async () => {
    const tanker = DEFAULT_SERVICES.find((s) => s.key === "tanker")!;
    await saveService("tanker", {
      nameEn: tanker.nameEn,
      nameNe: tanker.nameNe,
      icon: "water_drop",
      active: true,
      options: tanker.options.map((o) => ({ ...o, price: o.price + 100 })),
    });

    const catalog = await loadCatalog();
    expect(catalog[0].key).toBe("tanker");
    expect(catalog[0].options[0].price).toBe(tanker.options[0].price + 100);
  });

  it("bookings use the new price straight away", async () => {
    const tanker = DEFAULT_SERVICES.find((s) => s.key === "tanker")!;
    await saveService("tanker", {
      nameEn: tanker.nameEn,
      nameNe: tanker.nameNe,
      icon: "water_drop",
      active: true,
      options: [{ id: "6000L", labelEn: "6,000 Liters", labelNe: "६,००० लिटर", price: 9999 }],
    });
    expect((await findOption("tanker", "6000L"))?.option.price).toBe(9999);
    expect(await findOption("tanker", "8000L")).toBeNull(); // option was removed
  });

  it("a switched-off service can't be booked", async () => {
    await saveService("ac_repair", { ...acRepair, active: false });
    expect(await findOption("ac_repair", "visit")).toBeNull();
    // The built-in "house shifting" is off by default too.
    expect(await findOption("shifting", "mini_truck")).toBeNull();
  });

  it("rejects a badly written key", async () => {
    await expect(saveService("AC Repair!", acRepair)).rejects.toMatchObject({ status: 400 });
  });
});

describe("admin overview", () => {
  it("lists bookings, suppliers, problem reports and services with readable dates", async () => {
    await seedSupplier("s1", { createdAt: Timestamp.now() });
    await seedBooking("b1");
    await complaints().add({ bookingId: "b1", message: "Late", status: "open", createdAt: Timestamp.now() });

    const overview = await loadOverview();

    expect(overview.bookings).toHaveLength(1);
    expect(overview.suppliers).toHaveLength(1);
    expect(overview.complaints).toHaveLength(1);
    expect(overview.services.length).toBe(DEFAULT_SERVICES.length);
    // Dates become ISO strings, so they survive being sent as JSON.
    expect(typeof (overview.bookings[0] as Record<string, unknown>).createdAt).toBe("string");
    expect(overview.bookings[0]).toMatchObject({ id: "b1", status: "pending" });
    expect(overview.suppliers[0]).toMatchObject({ uid: "s1" });
  });

  it("is empty but valid for a brand-new database", async () => {
    const overview = await loadOverview();
    expect(overview.bookings).toEqual([]);
    expect(overview.complaints).toEqual([]);
  });
});

describe("resolving a problem report", () => {
  it("records what was done and by whom", async () => {
    const ref = await complaints().add({ bookingId: "b1", message: "Late", status: "open", createdAt: Timestamp.now() });
    await resolveComplaint(caller("a1", "admin"), ref.id, "Called customer, refunded Rs 500");

    expect(await read("complaints", ref.id)).toMatchObject({
      status: "resolved",
      resolution: "Called customer, refunded Rs 500",
      resolvedBy: "a1",
    });
  });

  it("is a 404 for a report that doesn't exist", async () => {
    await expect(resolveComplaint(caller("a1", "admin"), "ghost", "done")).rejects.toMatchObject({ status: 404 });
  });
});
