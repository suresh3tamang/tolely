import { FieldValue } from "firebase-admin/firestore";
import { after } from "next/server";
import { ApiError, handle, requireRole } from "@/lib/api";
import { db } from "@/lib/firebase-admin";
import { messages } from "@/lib/messages";
import { notifyUser } from "@/lib/notify";

/** Admin cancels any open booking (e.g. after a complaint or a no-show). */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireRole(req, "admin");
  const { id } = await ctx.params;
  const firestore = db();
  const ref = firestore.collection("bookings").doc(id);

  const booking = await firestore.runTransaction(async (tx) => {
    const booking = await tx.get(ref);
    if (!booking.exists) throw new ApiError(404, "Booking not found");
    if (["completed", "cancelled"].includes(booking.get("status"))) {
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

  const msg = messages.cancelled({
    id,
    serviceNameEn: booking.get("serviceNameEn"),
    serviceNameNe: booking.get("serviceNameNe"),
  });
  after(async () => {
    await notifyUser(booking.get("customerId"), msg);
    await notifyUser(booking.get("supplierId"), msg);
  });
  return Response.json({ ok: true });
});
