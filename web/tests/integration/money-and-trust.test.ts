import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadOverview } from "@/server/admin/admin.service";
import {
  acceptBooking,
  createBooking,
  updateBookingStatus,
} from "@/server/bookings/bookings.service";
import { CreateBookingSchema } from "@/server/bookings/schemas";
import { settlements } from "@/server/collections";
import { getSettings, saveSettings } from "@/server/settings/settings.service";
import { recordSettlement } from "@/server/suppliers/suppliers.service";
import { notifySuppliers, notifyUser } from "@/server/notifications/notify";
import { caller, read, resetDb, seedBooking, seedSupplier, seedUser } from "../helpers/db";

const customer = caller("cust1", "customer");
const supplier = caller("sup1", "supplier");
const admin = caller("admin1", "admin");

const bookingInput = () =>
  CreateBookingSchema.parse({
    serviceKey: "tanker",
    optionId: "8000L", // Rs 3,200
    address: "Balkot, Bhaktapur",
    scheduledFor: new Date(Date.now() + 2 * 3_600_000).toISOString(),
  });

/** Takes a booking all the way from the customer's request to "completed". */
async function runJob() {
  const { id } = await createBooking(customer, bookingInput());
  await acceptBooking(supplier, id);
  await updateBookingStatus(supplier, id, "on_the_way");
  await updateBookingStatus(supplier, id, "completed");
  return id;
}

beforeEach(async () => {
  await resetDb();
  vi.mocked(notifyUser).mockClear();
  vi.mocked(notifySuppliers).mockClear();
  await seedUser("cust1", "customer");
  await seedSupplier("sup1");
});

describe("settings", () => {
  it("the fee is off until an admin sets it", async () => {
    expect(await getSettings()).toEqual({ platformFeePercent: 0 });
  });

  it("an admin can set and change the fee", async () => {
    await saveSettings(admin, { platformFeePercent: 7.5 });
    expect(await getSettings()).toEqual({ platformFeePercent: 7.5 });
    await saveSettings(admin, { platformFeePercent: 0 });
    expect(await getSettings()).toEqual({ platformFeePercent: 0 });
  });
});

describe("platform fee on a job", () => {
  it("with no fee, the supplier keeps everything and owes nothing", async () => {
    const id = await runJob();

    expect(await read("bookings", id)).toMatchObject({ platformFeePercent: 0, platformFee: 0, supplierEarning: 3200 });
    expect(await read("suppliers", "sup1")).toMatchObject({ completedJobs: 1, feeBalance: 0, earningsTotal: 3200 });
  });

  it("with an 8% fee, the booking splits the price and the supplier owes the fee", async () => {
    await saveSettings(admin, { platformFeePercent: 8 });
    const id = await runJob();

    expect(await read("bookings", id)).toMatchObject({
      price: 3200,
      platformFeePercent: 8,
      platformFee: 256,
      supplierEarning: 2944,
    });
    expect(await read("suppliers", "sup1")).toMatchObject({
      completedJobs: 1,
      feeBalance: 256,
      feesTotal: 256,
      earningsTotal: 2944,
    });
  });

  it("changing the fee later does not change a job that is already booked", async () => {
    await saveSettings(admin, { platformFeePercent: 8 });
    const { id } = await createBooking(customer, bookingInput());
    await saveSettings(admin, { platformFeePercent: 20 }); // after booking, before completion

    await acceptBooking(supplier, id);
    await updateBookingStatus(supplier, id, "on_the_way");
    await updateBookingStatus(supplier, id, "completed");

    expect((await read("bookings", id))?.platformFee).toBe(256); // 8%, not 20%
  });

  it("adds up across several jobs", async () => {
    await saveSettings(admin, { platformFeePercent: 10 });
    await runJob();
    await runJob();

    expect(await read("suppliers", "sup1")).toMatchObject({ completedJobs: 2, feeBalance: 640, earningsTotal: 5760 });
  });

  it("bookings made before the fee existed are treated as no fee", async () => {
    await seedBooking("old", { status: "on_the_way", supplierId: "sup1" }); // no platformFeePercent field
    await updateBookingStatus(supplier, "old", "completed");
    expect(await read("bookings", "old")).toMatchObject({ platformFee: 0, supplierEarning: 3200 });
  });
});

describe("recording a supplier's payment of fees", () => {
  beforeEach(async () => {
    await saveSettings(admin, { platformFeePercent: 10 });
    await runJob(); // supplier now owes Rs 320
    await runJob(); // ... Rs 640
  });

  it("reduces what they owe and keeps a record", async () => {
    const result = await recordSettlement(admin, "sup1", 500, "Bank transfer, 9 Oct");

    expect(result).toEqual({ balance: 140 });
    expect(await read("suppliers", "sup1")).toMatchObject({ feeBalance: 140, feesSettled: 500, feesTotal: 640 });
    const saved = (await settlements().get()).docs.map((d) => d.data());
    expect(saved).toEqual([
      expect.objectContaining({ supplierId: "sup1", amount: 500, note: "Bank transfer, 9 Oct", recordedBy: "admin1" }),
    ]);
  });

  it("can settle the whole balance", async () => {
    expect(await recordSettlement(admin, "sup1", 640, "")).toEqual({ balance: 0 });
  });

  it("cannot take more than the supplier owes", async () => {
    await expect(recordSettlement(admin, "sup1", 641, "")).rejects.toMatchObject({ status: 400 });
    expect((await read("suppliers", "sup1"))?.feeBalance).toBe(640);
    expect((await settlements().get()).empty).toBe(true);
  });

  it("two payments at once can't take more than the balance", async () => {
    const results = await Promise.allSettled([
      recordSettlement(admin, "sup1", 400, ""),
      recordSettlement(admin, "sup1", 400, ""),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await read("suppliers", "sup1"))?.feeBalance).toBe(240);
  });

  it("is a 404 for someone who isn't a supplier", async () => {
    await expect(recordSettlement(admin, "ghost", 10, "")).rejects.toMatchObject({ status: 404 });
  });
});

describe("what the customer sees about their supplier", () => {
  it("a new supplier has no rating yet", async () => {
    await seedBooking("b1");
    await acceptBooking(supplier, "b1");

    expect(await read("bookings", "b1")).toMatchObject({ supplierRating: null, supplierRatingCount: 0, supplierJobs: 0 });
  });

  it("shows the average rating, the number of ratings and jobs done", async () => {
    await seedSupplier("sup2", { ratingSum: 23, ratingCount: 5, completedJobs: 12 });
    await seedBooking("b1");
    await acceptBooking(caller("sup2", "supplier"), "b1");

    expect(await read("bookings", "b1")).toMatchObject({ supplierRating: 4.6, supplierRatingCount: 5, supplierJobs: 12 });
  });

  it("is cleared when the supplier releases the job", async () => {
    await seedSupplier("sup2", { ratingSum: 23, ratingCount: 5, completedJobs: 12 });
    await seedBooking("b1");
    const sup2 = caller("sup2", "supplier");
    await acceptBooking(sup2, "b1");
    await updateBookingStatus(sup2, "b1", "pending");

    const booking = await read("bookings", "b1");
    expect(booking).not.toHaveProperty("supplierRating");
    expect(booking).not.toHaveProperty("supplierJobs");
  });
});

describe("admin overview includes the money data", () => {
  it("returns the fee setting and the payment history", async () => {
    await saveSettings(admin, { platformFeePercent: 10 });
    await runJob();
    await recordSettlement(admin, "sup1", 100, "Cash");

    const overview = await loadOverview();
    expect(overview.settings).toEqual({ platformFeePercent: 10 });
    expect(overview.settlements).toHaveLength(1);
    expect(overview.settlements[0]).toMatchObject({ supplierId: "sup1", amount: 100 });
    expect(overview.suppliers[0]).toMatchObject({ uid: "sup1", feeBalance: 220 });
  });
});
