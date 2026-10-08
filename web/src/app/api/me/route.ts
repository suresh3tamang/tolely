import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { ApiError, getCaller, handle, parseBody } from "@/lib/api";
import { adminAuth, db } from "@/lib/firebase-admin";

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

const OPEN_STATUSES = ["pending", "accepted", "on_the_way"];

/**
 * Deletes the caller's account and profile. Past bookings stay for records.
 * Open bookings must be finished or cancelled first.
 */
export const DELETE = handle(async (req: Request) => {
  const caller = await getCaller(req);
  if (caller.role === "admin") throw new ApiError(400, "Admin accounts are removed from the Firebase console");

  const bookings = db().collection("bookings");
  const [asCustomer, asSupplier] = await Promise.all([
    bookings.where("customerId", "==", caller.uid).where("status", "in", OPEN_STATUSES).limit(1).get(),
    bookings.where("supplierId", "==", caller.uid).where("status", "in", OPEN_STATUSES).limit(1).get(),
  ]);
  if (!asCustomer.empty || !asSupplier.empty) {
    throw new ApiError(409, "Finish or cancel your open bookings before deleting your account");
  }

  const batch = db().batch();
  batch.delete(db().collection("users").doc(caller.uid));
  batch.delete(db().collection("suppliers").doc(caller.uid));
  await batch.commit();
  await adminAuth().deleteUser(caller.uid);
  return Response.json({ ok: true });
});
