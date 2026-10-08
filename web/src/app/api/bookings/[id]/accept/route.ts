import { FieldValue } from "firebase-admin/firestore";
import { ApiError, handle, requireRole } from "@/lib/api";
import { db } from "@/lib/firebase-admin";

/** A verified supplier takes a pending job. First one to accept gets it. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const caller = await requireRole(req, "supplier");
  const { id } = await ctx.params;
  const firestore = db();

  const supplier = await firestore.collection("suppliers").doc(caller.uid).get();
  if (!supplier.get("verified")) throw new ApiError(403, "Your account is waiting for verification");

  const ref = firestore.collection("bookings").doc(id);
  await firestore.runTransaction(async (tx) => {
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
      acceptedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return Response.json({ ok: true });
});
