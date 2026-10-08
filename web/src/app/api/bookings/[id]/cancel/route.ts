import { FieldValue } from "firebase-admin/firestore";
import { ApiError, handle, requireRole } from "@/lib/api";
import { db } from "@/lib/firebase-admin";
import { CUSTOMER_CANCELLABLE, type BookingStatus } from "@/lib/types";

/** The customer cancels their own booking before the supplier is on the way. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const caller = await requireRole(req, "customer");
  const { id } = await ctx.params;
  const firestore = db();
  const ref = firestore.collection("bookings").doc(id);

  await firestore.runTransaction(async (tx) => {
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
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return Response.json({ ok: true });
});
