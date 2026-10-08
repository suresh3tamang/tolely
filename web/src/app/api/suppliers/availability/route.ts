import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { handle, parseBody, requireRole } from "@/lib/api";
import { db } from "@/lib/firebase-admin";

const AvailabilitySchema = z.object({ online: z.boolean() });

/** Supplier goes online (gets new-job alerts) or offline. */
export const POST = handle(async (req: Request) => {
  const caller = await requireRole(req, "supplier");
  const { online } = await parseBody(req, AvailabilitySchema);
  await db().collection("suppliers").doc(caller.uid).update({ online, onlineChangedAt: FieldValue.serverTimestamp() });
  return Response.json({ ok: true });
});
