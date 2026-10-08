import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { ApiError, handle, parseBody, requireRole } from "@/lib/api";
import { db } from "@/lib/firebase-admin";

const RateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).default(""),
});

/** The customer rates a completed job once; the supplier's totals update with it. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const caller = await requireRole(req, "customer");
  const { id } = await ctx.params;
  const { rating, comment } = await parseBody(req, RateSchema);
  const firestore = db();
  const ref = firestore.collection("bookings").doc(id);

  await firestore.runTransaction(async (tx) => {
    const booking = await tx.get(ref);
    if (!booking.exists || booking.get("customerId") !== caller.uid) {
      throw new ApiError(404, "Booking not found");
    }
    if (booking.get("status") !== "completed") throw new ApiError(409, "You can rate only completed jobs");
    if (booking.get("rating") != null) throw new ApiError(409, "Already rated");

    tx.update(ref, { rating, ratingComment: comment, updatedAt: FieldValue.serverTimestamp() });
    tx.update(firestore.collection("suppliers").doc(booking.get("supplierId")), {
      ratingSum: FieldValue.increment(rating),
      ratingCount: FieldValue.increment(1),
    });
  });

  return Response.json({ ok: true });
});
