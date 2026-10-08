import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { ApiError, handle, parseBody, requireRole } from "@/lib/api";
import { db } from "@/lib/firebase-admin";
import { SUPPLIER_TRANSITIONS, type BookingStatus } from "@/lib/types";

const StatusSchema = z.object({ status: z.enum(["pending", "on_the_way", "completed"]) });

/** The assigned supplier moves the job forward, or releases it back to pending. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const caller = await requireRole(req, "supplier");
  const { id } = await ctx.params;
  const { status } = await parseBody(req, StatusSchema);
  const firestore = db();
  const ref = firestore.collection("bookings").doc(id);

  await firestore.runTransaction(async (tx) => {
    const booking = await tx.get(ref);
    if (!booking.exists || booking.get("supplierId") !== caller.uid) {
      throw new ApiError(404, "Booking not found");
    }
    const current = booking.get("status") as BookingStatus;
    if (!SUPPLIER_TRANSITIONS[current]?.includes(status)) {
      throw new ApiError(409, `Cannot change from ${current} to ${status}`);
    }

    if (status === "pending") {
      tx.update(ref, {
        status,
        supplierId: null,
        supplierName: null,
        supplierPhone: null,
        vehicleNo: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    tx.update(ref, {
      status,
      [status === "completed" ? "completedAt" : "departedAt"]: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (status === "completed") {
      tx.update(firestore.collection("suppliers").doc(caller.uid), {
        completedJobs: FieldValue.increment(1),
      });
    }
  });

  return Response.json({ ok: true });
});
