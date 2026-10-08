import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { ApiError, handle, parseBody, requireRole } from "@/lib/api";
import { db } from "@/lib/firebase-admin";

const ReportSchema = z.object({ message: z.string().trim().min(5, "Please describe the problem").max(1000) });

/** Customer or assigned supplier reports a problem with a booking; admins follow up. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const caller = await requireRole(req, "customer", "supplier");
  const { id } = await ctx.params;
  const { message } = await parseBody(req, ReportSchema);

  const booking = await db().collection("bookings").doc(id).get();
  const isParty = booking.get("customerId") === caller.uid || booking.get("supplierId") === caller.uid;
  if (!booking.exists || !isParty) throw new ApiError(404, "Booking not found");

  await db().collection("complaints").add({
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
  return Response.json({ ok: true }, { status: 201 });
});
