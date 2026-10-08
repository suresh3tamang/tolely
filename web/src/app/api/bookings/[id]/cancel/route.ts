import { FieldValue } from "firebase-admin/firestore";
import { after } from "next/server";
import { ApiError, handle, requireRole } from "@/lib/api";
import { db } from "@/lib/firebase-admin";
import { messages } from "@/lib/messages";
import { notifyUser } from "@/lib/notify";
import { CUSTOMER_CANCELLABLE, type BookingStatus } from "@/lib/types";

/** The customer cancels their own booking before the supplier is on the way. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const caller = await requireRole(req, "customer");
  const { id } = await ctx.params;
  const firestore = db();
  const ref = firestore.collection("bookings").doc(id);

  const booking = await firestore.runTransaction(async (tx) => {
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
    notifyUser(
      booking.get("supplierId"),
      messages.cancelled({ id, serviceNameEn: booking.get("serviceNameEn"), serviceNameNe: booking.get("serviceNameNe") }),
    ),
  );
  return Response.json({ ok: true });
});
