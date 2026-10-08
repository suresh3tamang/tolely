import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { ApiError, handle, parseBody, requireRole } from "@/lib/api";
import { db } from "@/lib/firebase-admin";

const ResolveSchema = z.object({ resolution: z.string().trim().min(2, "Write what was done").max(1000) });

/** Admin closes a complaint with a note about what was done. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireRole(req, "admin");
  const { id } = await ctx.params;
  const { resolution } = await parseBody(req, ResolveSchema);

  const ref = db().collection("complaints").doc(id);
  if (!(await ref.get()).exists) throw new ApiError(404, "Complaint not found");
  await ref.update({
    status: "resolved",
    resolution,
    resolvedBy: admin.uid,
    resolvedAt: FieldValue.serverTimestamp(),
  });
  return Response.json({ ok: true });
});
