import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getCaller, handle, parseBody } from "@/lib/api";
import { db } from "@/lib/firebase-admin";

const DeviceSchema = z.object({
  token: z.string().min(10).max(4096),
  remove: z.boolean().default(false),
});

/** Registers (or on logout, removes) this phone's push notification token. */
export const POST = handle(async (req: Request) => {
  const caller = await getCaller(req);
  const { token, remove } = await parseBody(req, DeviceSchema);
  await db()
    .collection("users")
    .doc(caller.uid)
    .set({ fcmTokens: remove ? FieldValue.arrayRemove(token) : FieldValue.arrayUnion(token) }, { merge: true });
  return Response.json({ ok: true });
});
