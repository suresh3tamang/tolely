import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptBooking,
  cancelBookingAsAdmin,
  cancelBookingAsCustomer,
  createBooking,
  rateBooking,
  reportProblem,
  shareSupplierLocation,
  updateBookingStatus,
} from "@/server/bookings/bookings.service";
import { CreateBookingSchema } from "@/server/bookings/schemas";
import { complaints } from "@/server/collections";
import { notifySuppliers, notifyUser } from "@/server/notifications/notify";
import { flushAfter } from "../helpers/after";
import { caller, read, resetDb, seedBooking, seedSupplier, seedUser } from "../helpers/db";

const customer = caller("cust1", "customer");
const supplier = caller("sup1", "supplier");
const admin = caller("admin1", "admin");

/** What the route would pass after validating the app's request. */
const input = (extra: Record<string, unknown> = {}) =>
  CreateBookingSchema.parse({
    serviceKey: "tanker",
    optionId: "8000L",
    address: "Balkot, Bhaktapur",
    scheduledFor: new Date(Date.now() + 2 * 3_600_000).toISOString(),
    ...extra,
  });

beforeEach(async () => {
  await resetDb();
  vi.mocked(notifyUser).mockClear();
  vi.mocked(notifySuppliers).mockClear();
  await seedUser("cust1", "customer", { name: "Suresh" });
  await seedSupplier("sup1");
});

describe("creating a booking", () => {
  it("saves it as pending with the price taken from the catalog", async () => {
    const { id, price } = await createBooking(customer, input({ paymentMethod: "qr" }));

    expect(price).toBe(3200);
    const booking = await read("bookings", id);
    expect(booking).toMatchObject({
      status: "pending",
      price: 3200,
      customerId: "cust1",
      customerName: "Suresh",
      serviceNameNe: "पानी ट्याङ्कर",
      optionLabelEn: "8,000 Liters",
      paymentMethod: "qr",
      supplierId: null,
    });
  });

  it("stores the map pin", async () => {
    const { id } = await createBooking(customer, input({ location: { lat: 27.7, lng: 85.33 } }));
    expect((await read("bookings", id))?.location).toEqual({ lat: 27.7, lng: 85.33 });
  });

  it("keeps the time window and the contact person for the supplier", async () => {
    const start = Date.now() + 5 * 3_600_000;
    const { id } = await createBooking(
      customer,
      input({
        scheduledFor: new Date(start).toISOString(),
        scheduledEnd: new Date(start + 3 * 3_600_000).toISOString(),
        contactName: "Hari (brother)",
        contactPhone: "+9779811122233",
      }),
    );
    const booking = await read("bookings", id);
    expect(booking?.scheduledEnd.toMillis() - booking?.scheduledFor.toMillis()).toBe(3 * 3_600_000);
    expect(booking).toMatchObject({ contactName: "Hari (brother)", contactPhone: "+9779811122233" });
  });

  it("defaults the contact to the account holder, and refuses a bad window or number", async () => {
    const { id } = await createBooking(customer, input());
    expect(await read("bookings", id)).toMatchObject({ contactName: "Suresh", scheduledEnd: null });

    const start = Date.now() + 5 * 3_600_000;
    const iso = (ms: number) => new Date(ms).toISOString();
    await expect(createBooking(customer, input({ scheduledFor: iso(start), scheduledEnd: iso(start - 1000) }))).rejects.toMatchObject({ status: 400 });
    await expect(createBooking(customer, input({ scheduledFor: iso(start), scheduledEnd: iso(start + 13 * 3_600_000) }))).rejects.toMatchObject({ status: 400 });
    const over = Date.now() - 3_600_000;
    await expect(createBooking(customer, input({ scheduledFor: iso(over - 3_600_000), scheduledEnd: iso(over) }))).rejects.toMatchObject({ status: 400 });
    expect(() => input({ contactPhone: "12345" })).toThrow();
  });

  it("rejects an unknown service or option", async () => {
    await expect(createBooking(customer, input({ serviceKey: "spaceship" }))).rejects.toMatchObject({ status: 400 });
    await expect(createBooking(customer, input({ optionId: "99999L" }))).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a time in the past or too far ahead", async () => {
    const past = new Date(Date.now() - 3_600_000).toISOString();
    const far = new Date(Date.now() + 40 * 86_400_000).toISOString();
    await expect(createBooking(customer, input({ scheduledFor: past }))).rejects.toMatchObject({ status: 400 });
    await expect(createBooking(customer, input({ scheduledFor: far }))).rejects.toMatchObject({ status: 400 });
  });

  it("alerts suppliers of that service after responding", async () => {
    await createBooking(customer, input());
    expect(notifySuppliers).not.toHaveBeenCalled(); // not before the response
    await flushAfter();
    expect(notifySuppliers).toHaveBeenCalledWith("tanker", expect.objectContaining({ titleEn: "New job available" }));
  });
});

describe("accepting a job", () => {
  it("assigns the supplier and tells the customer", async () => {
    await seedBooking("b1");
    await acceptBooking(supplier, "b1");
    await flushAfter();

    expect(await read("bookings", "b1")).toMatchObject({
      status: "accepted",
      supplierId: "sup1",
      supplierName: "Supplier sup1",
      vehicleNo: "Ba 1 Kha 2345",
    });
    expect(notifyUser).toHaveBeenCalledWith("cust1", expect.objectContaining({ titleEn: "Booking accepted" }));
  });

  it("gives the job to only one supplier when two accept", async () => {
    await seedSupplier("sup2");
    await seedBooking("b1");

    const results = await Promise.allSettled([
      acceptBooking(caller("sup1", "supplier"), "b1"),
      acceptBooking(caller("sup2", "supplier"), "b1"),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(failed.reason).toMatchObject({ status: 409 });
  });

  it("refuses an unverified supplier", async () => {
    await seedSupplier("sup3", { verified: false });
    await seedBooking("b1");
    await expect(acceptBooking(caller("sup3", "supplier"), "b1")).rejects.toMatchObject({ status: 403 });
    expect((await read("bookings", "b1"))?.status).toBe("pending");
  });

  it("refuses a supplier who doesn't offer that service", async () => {
    await seedSupplier("sup4", { services: ["plumber"] });
    await seedBooking("b1");
    await expect(acceptBooking(caller("sup4", "supplier"), "b1")).rejects.toMatchObject({ status: 403 });
  });

  it("returns 404 for a booking that doesn't exist", async () => {
    await expect(acceptBooking(supplier, "nope")).rejects.toMatchObject({ status: 404 });
  });
});

describe("moving a job forward", () => {
  beforeEach(() => seedBooking("b1", { status: "accepted", supplierId: "sup1", supplierName: "Supplier sup1" }));

  it("goes accepted → on the way → completed, and counts the finished job", async () => {
    await updateBookingStatus(supplier, "b1", "on_the_way");
    await flushAfter();
    expect(await read("bookings", "b1")).toMatchObject({ status: "on_the_way" });
    expect(notifyUser).toHaveBeenCalledWith("cust1", expect.objectContaining({ titleEn: "On the way" }));

    await updateBookingStatus(supplier, "b1", "completed");
    await flushAfter();
    expect((await read("bookings", "b1"))?.status).toBe("completed");
    expect((await read("suppliers", "sup1"))?.completedJobs).toBe(1);
    expect(notifyUser).toHaveBeenCalledWith("cust1", expect.objectContaining({ titleEn: "Job completed" }));
  });

  it("does not allow skipping 'on the way'", async () => {
    await expect(updateBookingStatus(supplier, "b1", "completed")).rejects.toMatchObject({ status: 409 });
  });

  it("only lets the assigned supplier change the job", async () => {
    await seedSupplier("sup2");
    await expect(updateBookingStatus(caller("sup2", "supplier"), "b1", "on_the_way")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("releasing a job makes it available again and clears the supplier", async () => {
    await updateBookingStatus(supplier, "b1", "pending");
    await flushAfter();

    const booking = await read("bookings", "b1");
    expect(booking).toMatchObject({ status: "pending", supplierId: null, supplierName: null, supplierPhone: null });
    expect(booking).not.toHaveProperty("vehicleNo");
    expect(notifyUser).toHaveBeenCalledWith("cust1", expect.objectContaining({ titleEn: "Finding another supplier" }));
    expect(notifySuppliers).toHaveBeenCalledWith("tanker", expect.anything());
  });
});

describe("live location", () => {
  it("is shared only while on the way, and cleared when the job ends", async () => {
    await seedBooking("b1", { status: "accepted", supplierId: "sup1" });
    await expect(shareSupplierLocation(supplier, "b1", { lat: 27.7, lng: 85.3 })).rejects.toMatchObject({ status: 409 });

    await updateBookingStatus(supplier, "b1", "on_the_way");
    await shareSupplierLocation(supplier, "b1", { lat: 27.7, lng: 85.3 });
    expect((await read("bookings", "b1"))?.supplierLocation).toMatchObject({ lat: 27.7, lng: 85.3 });

    await updateBookingStatus(supplier, "b1", "completed");
    expect(await read("bookings", "b1")).not.toHaveProperty("supplierLocation");
  });

  it("can't be shared by someone else's supplier", async () => {
    await seedBooking("b1", { status: "on_the_way", supplierId: "sup1" });
    await seedSupplier("sup2");
    await expect(shareSupplierLocation(caller("sup2", "supplier"), "b1", { lat: 27.7, lng: 85.3 })).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("cancelling", () => {
  it("lets the customer cancel a pending or accepted booking", async () => {
    await seedBooking("b1");
    await cancelBookingAsCustomer(customer, "b1");
    expect((await read("bookings", "b1"))?.status).toBe("cancelled");

    await seedBooking("b2", { status: "accepted", supplierId: "sup1" });
    await cancelBookingAsCustomer(customer, "b2");
    await flushAfter();
    expect(notifyUser).toHaveBeenCalledWith("sup1", expect.objectContaining({ titleEn: "Booking cancelled" }));
  });

  it("does not let the customer cancel once the supplier is on the way", async () => {
    await seedBooking("b1", { status: "on_the_way", supplierId: "sup1" });
    await expect(cancelBookingAsCustomer(customer, "b1")).rejects.toMatchObject({ status: 409 });
  });

  it("does not let a customer cancel someone else's booking", async () => {
    await seedBooking("b1", { customerId: "other" });
    await expect(cancelBookingAsCustomer(customer, "b1")).rejects.toMatchObject({ status: 404 });
  });

  it("lets an admin cancel an open booking and clears live location", async () => {
    await seedBooking("b1", {
      status: "on_the_way",
      supplierId: "sup1",
      supplierLocation: { lat: 27.7, lng: 85.3 },
    });
    await cancelBookingAsAdmin(admin, "b1");
    await flushAfter();

    const booking = await read("bookings", "b1");
    expect(booking).toMatchObject({ status: "cancelled", cancelledBy: "admin1" });
    expect(booking).not.toHaveProperty("supplierLocation");
    expect(notifyUser).toHaveBeenCalledWith("cust1", expect.anything());
    expect(notifyUser).toHaveBeenCalledWith("sup1", expect.anything());
  });

  it("does not let an admin cancel a finished booking", async () => {
    await seedBooking("b1", { status: "completed", supplierId: "sup1" });
    await expect(cancelBookingAsAdmin(admin, "b1")).rejects.toMatchObject({ status: 409 });
  });
});

describe("rating", () => {
  it("updates the booking and the supplier's totals", async () => {
    await seedBooking("b1", { status: "completed", supplierId: "sup1" });
    await seedBooking("b2", { status: "completed", supplierId: "sup1" });

    await rateBooking(customer, "b1", 5, "Great");
    await rateBooking(customer, "b2", 4, "");

    expect(await read("bookings", "b1")).toMatchObject({ rating: 5, ratingComment: "Great" });
    expect(await read("suppliers", "sup1")).toMatchObject({ ratingSum: 9, ratingCount: 2 });
  });

  it("allows one rating per job", async () => {
    await seedBooking("b1", { status: "completed", supplierId: "sup1" });
    await rateBooking(customer, "b1", 5, "");
    await expect(rateBooking(customer, "b1", 1, "")).rejects.toMatchObject({ status: 409 });
    expect((await read("suppliers", "sup1"))?.ratingCount).toBe(1);
  });

  it("only allows rating finished jobs, and only by their customer", async () => {
    await seedBooking("b1", { status: "accepted", supplierId: "sup1" });
    await expect(rateBooking(customer, "b1", 5, "")).rejects.toMatchObject({ status: 409 });

    await seedBooking("b2", { status: "completed", supplierId: "sup1", customerId: "other" });
    await expect(rateBooking(customer, "b2", 5, "")).rejects.toMatchObject({ status: 404 });
  });
});

describe("problem reports", () => {
  it("are saved for admins, from either side of the booking", async () => {
    await seedBooking("b1", { status: "accepted", supplierId: "sup1" });

    await reportProblem(customer, "b1", "Supplier is late");
    await reportProblem(supplier, "b1", "Customer not answering");

    const saved = (await complaints().get()).docs.map((d) => d.data());
    expect(saved).toHaveLength(2);
    expect(saved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ bookingId: "b1", status: "open", reporterRole: "customer", message: "Supplier is late" }),
        expect.objectContaining({ reporterRole: "supplier" }),
      ]),
    );
  });

  it("are refused from people who aren't part of the booking", async () => {
    await seedBooking("b1", { status: "accepted", supplierId: "sup1" });
    await expect(reportProblem(caller("stranger", "customer"), "b1", "I am nosy")).rejects.toMatchObject({ status: 404 });
  });
});
