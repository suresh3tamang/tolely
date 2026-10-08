import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getCaller, handle, parseBody } from "@/lib/api";
import { db } from "@/lib/firebase-admin";

/** The signed-in user's profile, plus their supplier record if they have one. */
export const GET = handle(async (req: Request) => {
  const { uid } = await getCaller(req);
  const [user, supplier] = await Promise.all([
    db().collection("users").doc(uid).get(),
    db().collection("suppliers").doc(uid).get(),
  ]);
  return Response.json({
    user: user.exists ? { uid, ...user.data() } : null,
    supplier: supplier.exists ? supplier.data() : null,
  });
});

const ProfileSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  address: z.string().trim().min(3, "Address is required").max(200),
  landmark: z.string().trim().max(200).default(""),
  language: z.enum(["en", "ne"]).default("ne"),
});

/** Creates or updates the profile. New users start as customers. */
export const POST = handle(async (req: Request) => {
  const caller = await getCaller(req);
  const body = await parseBody(req, ProfileSchema);
  const ref = db().collection("users").doc(caller.uid);

  await ref.set(
    {
      ...body,
      phone: caller.phone,
      ...(caller.role ? {} : { role: "customer", createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return Response.json({ user: { uid: caller.uid, ...(await ref.get()).data() } });
});
