import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { after } from "next/server";
import { findOption } from "@/server/catalog/catalog.service";
import { bookings, complaints, suppliers, users } from "@/server/collections";
import { db } from "@/server/firebase";
import { ApiError, type Caller } from "@/server/http";
import { messages } from "@/server/notifications/messages";
import { getSettings } from "@/server/settings/settings.service";
import { tell } from "@/server/notifications/inbox";
import { notifySuppliers } from "@/server/notifications/notify";
import type { BookingStatus } from "@/shared/types";
import { NEAR_KM, distanceKm, etaMinutes, type LatLng } from "@/shared/geo";
import { computeEarning, computeFee } from "./fees";
import { ADMIN_CANCELLABLE, CUSTOMER_CANCELLABLE, canSupplierChange, isAcceptableBookingWindow } from "./rules";
import type { CreateBookingInput } from "./schemas";

// Every change to a booking goes through this file. Routes only check who is
// calling and what they sent; the rules live here (and in rules.ts).
// Notifications are sent after the response, so they never slow a request down.

/** Customer creates a booking. The price comes from the catalog, never from the app. */
export async function createBooking(caller: Caller, input: CreateBookingInput) {
  // The supplier phones the customer, so every booking needs a verified number.
  if (!caller.phone) throw new ApiError(403, "Please verify your phone number before booking.");

  const match = await findOption(input.serviceKey, input.optionId);
  if (!match) throw new ApiError(400, "Unknown service or option");

  const when = new Date(input.scheduledFor).getTime();
  const end = input.scheduledEnd ? new Date(input.scheduledEnd).getTime() : null;
  if (!isAcceptableBookingWindow(when, end, Date.now())) throw new ApiError(400, "Choose a time within the next 30 days");

  const [user, { platformFeePercent }] = await Promise.all([users().doc(caller.uid).get(), getSettings()]);
  const ref = await bookings().add({
    customerId: caller.uid,
    customerName: user.get("name") ?? "",
    customerPhone: caller.phone,
    contactName: input.contactName || (user.get("name") ?? ""),
    contactPhone: input.contactPhone || caller.phone,
    serviceKey: match.service.key,
    serviceNameEn: match.service.nameEn,
    serviceNameNe: match.service.nameNe,
    optionId: match.option.id,
    optionLabelEn: match.option.labelEn,
    optionLabelNe: match.option.labelNe,
    price: match.option.price,
    platformFeePercent, // frozen now, so a later fee change can't affect this job
    address: input.address,
    landmark: input.landmark,
    note: input.note,
    location: input.location,
    paymentMethod: input.paymentMethod,
    scheduledFor: Timestamp.fromMillis(when),
    scheduledEnd: end === null ? null : Timestamp.fromMillis(end),
    status: "pending",
    supplierId: null,
    supplierName: null,
    supplierPhone: null,
    rating: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  after(() =>
    notifySuppliers(
      match.service.key,
      messages.newJob({
        id: ref.id,
        serviceNameEn: match.service.nameEn,
        serviceNameNe: match.service.nameNe,
        optionLabelEn: match.option.labelEn,
        optionLabelNe: match.option.labelNe,
      }),
    ),
  );
  return { id: ref.id, price: match.option.price };
}

/** A verified supplier takes a pending job. The first one to accept gets it. */
export async function acceptBooking(caller: Caller, id: string) {
  const supplier = await suppliers().doc(caller.uid).get();
  if (!supplier.get("verified")) throw new ApiError(403, "Your account is waiting for verification");

  const ratingCount: number = supplier.get("ratingCount") ?? 0;
  const ref = bookings().doc(id);
  const booking = await db().runTransaction(async (tx) => {
    const booking = await tx.get(ref);
    if (!booking.exists) throw new ApiError(404, "Booking not found");
    if (booking.get("status") !== "pending") throw new ApiError(409, "This job is already taken");
    if (!(supplier.get("services") as string[]).includes(booking.get("serviceKey"))) {
      throw new ApiError(403, "You don't offer this service");
    }
    tx.update(ref, {
      status: "accepted",
      supplierId: caller.uid,
      supplierName: supplier.get("name"),
      supplierPhone: supplier.get("phone"),
      vehicleNo: supplier.get("vehicleNo") ?? "",
      // What the customer sees about their supplier (a snapshot at acceptance).
      supplierRating: ratingCount > 0 ? Number(((supplier.get("ratingSum") ?? 0) / ratingCount).toFixed(1)) : null,
      supplierRatingCount: ratingCount,
      supplierJobs: supplier.get("completedJobs") ?? 0,
      acceptedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return booking;
  });

  after(() =>
    tell(
      booking.get("customerId"),
      messages.accepted({
        id,
        serviceNameEn: booking.get("serviceNameEn"),
        serviceNameNe: booking.get("serviceNameNe"),
        supplierName: supplier.get("name"),
      }),
    ),
  );
}

/** The assigned supplier moves the job forward, or releases it back to pending. */
export async function updateBookingStatus(
  caller: Caller,
  id: string,
  status: Extract<BookingStatus, "pending" | "on_the_way" | "completed">,
) {
  const ref = bookings().doc(id);

  const booking = await db().runTransaction(async (tx) => {
    const booking = await tx.get(ref);
    if (!booking.exists || booking.get("supplierId") !== caller.uid) {
      throw new ApiError(404, "Booking not found");
    }
    const current = booking.get("status") as BookingStatus;
    if (!canSupplierChange(current, status)) {
      throw new ApiError(409, `Cannot change from ${current} to ${status}`);
    }

    if (status === "pending") {
      // Released: another supplier can take it.
      tx.update(ref, {
        status,
        supplierId: null,
        supplierName: null,
        supplierPhone: null,
        vehicleNo: FieldValue.delete(),
        supplierRating: FieldValue.delete(),
        supplierRatingCount: FieldValue.delete(),
        supplierJobs: FieldValue.delete(),
        supplierLocation: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return booking;
    }

    if (status === "on_the_way") {
      tx.update(ref, { status, departedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      return booking;
    }

    // Completed: settle the money. The supplier collects the payment from the
    // customer, so the platform fee becomes an amount they owe Tolely.
    const price: number = booking.get("price") ?? 0;
    const percent: number = booking.get("platformFeePercent") ?? 0;
    const fee = computeFee(price, percent);
    const earning = computeEarning(price, percent);
    tx.update(ref, {
      status,
      completedAt: FieldValue.serverTimestamp(),
      platformFee: fee,
      supplierEarning: earning,
      supplierLocation: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(suppliers().doc(caller.uid), {
      completedJobs: FieldValue.increment(1),
      earningsTotal: FieldValue.increment(earning),
      feesTotal: FieldValue.increment(fee),
      feeBalance: FieldValue.increment(fee),
    });
    return booking;
  });

  const summary = {
    id,
    serviceNameEn: booking.get("serviceNameEn"),
    serviceNameNe: booking.get("serviceNameNe"),
    supplierName: booking.get("supplierName"),
  };
  const customerId = booking.get("customerId");
  after(async () => {
    if (status === "on_the_way") await tell(customerId, messages.onTheWay(summary));
    if (status === "completed") await tell(customerId, messages.completed(summary));
    if (status === "pending") {
      await tell(customerId, messages.released(summary));
      await notifySuppliers(
        booking.get("serviceKey"),
        messages.newJob({
          ...summary,
          optionLabelEn: booking.get("optionLabelEn"),
          optionLabelNe: booking.get("optionLabelNe"),
        }),
      );
    }
  });
}

/** The customer cancels their own booking before the supplier is on the way. */
export async function cancelBookingAsCustomer(caller: Caller, id: string) {
  const ref = bookings().doc(id);

  const booking = await db().runTransaction(async (tx) => {
    const booking = await tx.get(ref);
    if (!booking.exists || booking.get("customerId") !== caller.uid) {
      throw new ApiError(404, "Booking not found");
    }
    if (!CUSTOMER_CANCELLABLE.includes(booking.get("status") as BookingStatus)) {
      throw new ApiError(409, "This booking can no longer be cancelled");
    }
    tx.update(ref, {
      status: "cancelled",
      cancelledAt: FieldValue.serverTimestamp(),
      supplierLocation: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return booking;
  });

  after(() =>
    tell(
      booking.get("supplierId"),
      messages.cancelled({ id, serviceNameEn: booking.get("serviceNameEn"), serviceNameNe: booking.get("serviceNameNe") }),
    ),
  );
}

/** An admin cancels any open booking (e.g. after a complaint or a no-show). */
export async function cancelBookingAsAdmin(admin: Caller, id: string) {
  const ref = bookings().doc(id);

  const booking = await db().runTransaction(async (tx) => {
    const booking = await tx.get(ref);
    if (!booking.exists) throw new ApiError(404, "Booking not found");
    if (!ADMIN_CANCELLABLE.includes(booking.get("status") as BookingStatus)) {
      throw new ApiError(409, "This booking is already closed");
    }
    tx.update(ref, {
      status: "cancelled",
      cancelledBy: admin.uid,
      cancelledAt: FieldValue.serverTimestamp(),
      supplierLocation: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return booking;
  });

  const message = messages.cancelled({
    id,
    serviceNameEn: booking.get("serviceNameEn"),
    serviceNameNe: booking.get("serviceNameNe"),
  });
  after(async () => {
    await tell(booking.get("customerId"), message);
    await tell(booking.get("supplierId"), message);
  });
}

/** The customer rates a completed job once; the supplier's totals update with it. */
export async function rateBooking(caller: Caller, id: string, rating: number, comment: string) {
  const ref = bookings().doc(id);

  await db().runTransaction(async (tx) => {
    const booking = await tx.get(ref);
    if (!booking.exists || booking.get("customerId") !== caller.uid) {
      throw new ApiError(404, "Booking not found");
    }
    if (booking.get("status") !== "completed") throw new ApiError(409, "You can rate only completed jobs");
    if (booking.get("rating") != null) throw new ApiError(409, "Already rated");

    tx.update(ref, { rating, ratingComment: comment, updatedAt: FieldValue.serverTimestamp() });
    tx.update(suppliers().doc(booking.get("supplierId")), {
      ratingSum: FieldValue.increment(rating),
      ratingCount: FieldValue.increment(1),
    });
  });
}

/** The customer or the assigned supplier reports a problem; admins follow up. */
export async function reportProblem(caller: Caller, id: string, message: string) {
  const booking = await bookings().doc(id).get();
  const isParty = booking.get("customerId") === caller.uid || booking.get("supplierId") === caller.uid;
  if (!booking.exists || !isParty) throw new ApiError(404, "Booking not found");

  await complaints().add({
    bookingId: id,
    serviceNameEn: booking.get("serviceNameEn"),
    reporterId: caller.uid,
    reporterRole: caller.role,
    reporterPhone: caller.phone,
    customerId: booking.get("customerId"),
    supplierId: booking.get("supplierId"),
    message,
    status: "open",
    createdAt: FieldValue.serverTimestamp(),
  });
}

/** The assigned supplier shares where they are while on the way, for live tracking. */
export async function shareSupplierLocation(caller: Caller, id: string, { lat, lng }: LatLng) {
  const ref = bookings().doc(id);
  const booking = await ref.get();
  if (!booking.exists || booking.get("supplierId") !== caller.uid) throw new ApiError(404, "Booking not found");
  if (booking.get("status") !== "on_the_way") throw new ApiError(409, "Location is shared only while on the way");

  await ref.update({ supplierLocation: { lat, lng, at: FieldValue.serverTimestamp() } });

  // Close to the customer for the first time: tell them to get ready.
  const home = booking.get("location") as LatLng | null | undefined;
  if (home && !booking.get("nearNotifiedAt") && distanceKm({ lat, lng }, home) <= NEAR_KM) {
    await ref.update({ nearNotifiedAt: FieldValue.serverTimestamp() });
    after(() => tell(booking.get("customerId"), messages.near({ ...summaryOf(id, booking), minutes: etaMinutes({ lat, lng }, home) })));
  }
}

/** The fields every booking message needs. */
function summaryOf(id: string, booking: FirebaseFirestore.DocumentSnapshot) {
  return {
    id,
    serviceNameEn: booking.get("serviceNameEn"),
    serviceNameNe: booking.get("serviceNameNe"),
    supplierName: booking.get("supplierName"),
  };
}

/** The assigned supplier says they have arrived at the customer's place. */
export async function markArrived(caller: Caller, id: string) {
  const ref = bookings().doc(id);
  const booking = await ref.get();
  if (!booking.exists || booking.get("supplierId") !== caller.uid) throw new ApiError(404, "Booking not found");
  if (booking.get("status") !== "on_the_way") throw new ApiError(409, "Start the trip first");
  if (booking.get("arrivedAt")) return; // already said so

  await ref.update({ arrivedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  after(() => tell(booking.get("customerId"), messages.arrived(summaryOf(id, booking))));
}

/** The assigned supplier says they will be late by some minutes; the customer is told. */
export async function reportLate(caller: Caller, id: string, minutes: number) {
  const ref = bookings().doc(id);
  const booking = await ref.get();
  if (!booking.exists || booking.get("supplierId") !== caller.uid) throw new ApiError(404, "Booking not found");
  if (!["accepted", "on_the_way"].includes(booking.get("status"))) throw new ApiError(409, "This job is not open");
  if (booking.get("arrivedAt")) throw new ApiError(409, "You have already arrived");

  await ref.update({
    lateByMinutes: minutes,
    lateReportedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  after(() => tell(booking.get("customerId"), messages.late({ ...summaryOf(id, booking), minutes })));
}

/**
 * Runs every few minutes (a cron job): finds open bookings whose time window is over with nobody on the way,
 * tells the customer once, and reminds the supplier. Returns how many bookings were handled.
 */
export async function notifyLateBookings(now = Date.now()) {
  // Open bookings are few, so they are filtered here instead of needing an extra database index.
  const open = await bookings().where("status", "in", ["pending", "accepted"]).get();
  const late = open.docs.filter((b) => {
    if (b.get("delayNotifiedAt")) return false;
    const end = (b.get("scheduledEnd") ?? b.get("scheduledFor")) as Timestamp | undefined;
    // A supplier who said "running late" gets that much extra time first.
    const grace = ((b.get("lateByMinutes") as number | undefined) ?? 0) * 60_000;
    return !!end && end.toMillis() + grace < now;
  });

  for (const b of late) {
    await b.ref.update({ delayNotifiedAt: FieldValue.serverTimestamp() });
    const summary = summaryOf(b.id, b);
    await tell(b.get("customerId"), messages.delayed(summary));
    if (b.get("supplierId")) await tell(b.get("supplierId"), messages.reminder(summary));
  }
  return late.length;
}
