import { FieldValue } from "firebase-admin/firestore";
import { ApiError, handle, parseBody, requireRole } from "@/lib/api";
import { db } from "@/lib/firebase-admin";
import { LatLngSchema } from "@/lib/geo";

/** The assigned supplier shares where they are while on the way, for live tracking. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const caller = await requireRole(req, "supplier");
  const { id } = await ctx.params;
  const { lat, lng } = await parseBody(req, LatLngSchema);

  const ref = db().collection("bookings").doc(id);
  const booking = await ref.get();
  if (!booking.exists || booking.get("supplierId") !== caller.uid) throw new ApiError(404, "Booking not found");
  if (booking.get("status") !== "on_the_way") throw new ApiError(409, "Location is shared only while on the way");

  await ref.update({ supplierLocation: { lat, lng, at: FieldValue.serverTimestamp() } });
  return Response.json({ ok: true });
});
