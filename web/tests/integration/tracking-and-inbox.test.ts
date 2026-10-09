import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptBooking,
  markArrived,
  notifyLateBookings,
  reportLate,
  shareSupplierLocation,
  updateBookingStatus,
} from "@/server/bookings/bookings.service";
import { inbox } from "@/server/collections";
import { markSeen } from "@/server/notifications/inbox";
import { notifyUser } from "@/server/notifications/notify";
import { flushAfter } from "../helpers/after";
import { caller, read, resetDb, seedBooking, seedSupplier, seedUser } from "../helpers/db";

const supplier = caller("sup1", "supplier");
const HOME = { lat: 27.665, lng: 85.3667 }; // Balkot

async function bell(uid = "cust1") {
  const docs = (await inbox(uid).orderBy("createdAt", "asc").get()).docs;
  return docs.map((d) => ({ id: d.id, ...(d.data() as { type: string; seen: boolean; bodyEn: string }) }));
}

beforeEach(async () => {
  await resetDb();
  vi.mocked(notifyUser).mockClear();
  await seedUser("cust1", "customer", { name: "Suresh" });
  await seedSupplier("sup1");
});

describe("every status reaches the customer's bell", () => {
  it("accepted, on the way, almost there, arrived, completed", async () => {
    await seedBooking("b1", { location: HOME });
    await acceptBooking(supplier, "b1");
    await updateBookingStatus(supplier, "b1", "on_the_way");
    await shareSupplierLocation(supplier, "b1", { lat: 27.7, lng: 85.33 }); // far away: no message
    await shareSupplierLocation(supplier, "b1", { lat: 27.667, lng: 85.367 }); // ~250 m away
    await shareSupplierLocation(supplier, "b1", { lat: 27.666, lng: 85.367 }); // still near: not again
    await markArrived(supplier, "b1");
    await updateBookingStatus(supplier, "b1", "completed");
    await flushAfter();

    const items = await bell();
    expect(items.map((n) => n.type)).toEqual(["accepted", "on_the_way", "near", "arrived", "completed"]);
    expect(items.every((n) => n.seen === false)).toBe(true);
    expect(items[2].bodyEn).toMatch(/about \d+ min away/);
    expect(notifyUser).toHaveBeenCalledTimes(5); // and each one is also a push

    const booking = await read("bookings", "b1");
    for (const field of ["acceptedAt", "departedAt", "arrivedAt", "completedAt"]) expect(booking?.[field]).toBeInstanceOf(Timestamp);
  });

  it("'running late' tells the customer how late", async () => {
    await seedBooking("b1", { status: "accepted", supplierId: "sup1", supplierName: "Hari" });
    await reportLate(supplier, "b1", 30);
    await flushAfter();
    const [n] = await bell();
    expect(n).toMatchObject({ type: "late", bodyEn: "Hari is running about 30 min late. Sorry for the wait." });
    expect((await read("bookings", "b1"))?.lateByMinutes).toBe(30);
  });

  it("only the assigned supplier can say arrived, and only once on the way", async () => {
    await seedBooking("b1", { status: "accepted", supplierId: "sup1" });
    await expect(markArrived(supplier, "b1")).rejects.toMatchObject({ status: 409 });
    await expect(markArrived(caller("sup2", "supplier"), "b1")).rejects.toMatchObject({ status: 404 });
  });
});

describe("late bookings (the 10-minute check)", () => {
  const ago = (min: number) => Timestamp.fromMillis(Date.now() - min * 60_000);

  it("tells the customer once, and reminds the supplier", async () => {
    await seedBooking("late", { status: "accepted", supplierId: "sup1", supplierName: "Hari", scheduledFor: ago(200), scheduledEnd: ago(20) });
    await seedBooking("searching", { status: "pending", scheduledFor: ago(200), scheduledEnd: ago(20) });
    await seedBooking("fine", { status: "accepted", supplierId: "sup1", scheduledFor: ago(30), scheduledEnd: ago(-150) });
    await seedBooking("coming", { status: "on_the_way", supplierId: "sup1", scheduledEnd: ago(20) });

    expect(await notifyLateBookings()).toBe(2);
    expect(await notifyLateBookings()).toBe(0); // not twice

    const customerBell = await bell();
    expect(customerBell.map((n) => n.type)).toEqual(["delayed", "delayed"]);
    expect(customerBell.some((n) => n.bodyEn.includes("still looking for a supplier"))).toBe(true);
    expect((await bell("sup1")).map((n) => n.type)).toEqual(["reminder"]);
  });

  it("gives extra time when the supplier said they're running late", async () => {
    await seedBooking("b1", { status: "accepted", supplierId: "sup1", scheduledEnd: ago(20), lateByMinutes: 30 });
    expect(await notifyLateBookings()).toBe(0);
  });
});

describe("seen", () => {
  it("marking seen takes them off the count", async () => {
    await seedBooking("b1", { status: "accepted", supplierId: "sup1", supplierName: "Hari" });
    await reportLate(supplier, "b1", 15);
    await reportLate(supplier, "b1", 30);
    await flushAfter();
    const [first] = await bell();

    expect(await markSeen("cust1", [first.id])).toBe(1);
    expect((await bell()).filter((n) => !n.seen)).toHaveLength(1);
    await markSeen("cust1", "all");
    expect((await bell()).filter((n) => !n.seen)).toHaveLength(0);
    expect(await markSeen("cust1", ["does-not-exist"])).toBe(1); // unknown ids are ignored, not an error
  });
});
