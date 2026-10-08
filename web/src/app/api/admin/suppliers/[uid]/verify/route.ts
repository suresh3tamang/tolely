import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { ApiError, handle, parseBody, requireRole } from "@/lib/api";
import { db } from "@/lib/firebase-admin";

const VerifySchema = z.object({ verified: z.boolean() });

/** Admin approves (or suspends) a supplier after checking their documents. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ uid: string }> }) => {
  const admin = await requireRole(req, "admin");
  const { uid } = await ctx.params;
  const { verified } = await parseBody(req, VerifySchema);

  const ref = db().collection("suppliers").doc(uid);
  if (!(await ref.get()).exists) throw new ApiError(404, "Supplier not found");
  await ref.update({
    verified,
    verifiedBy: admin.uid,
    verifiedAt: FieldValue.serverTimestamp(),
  });
  return Response.json({ ok: true });
});
