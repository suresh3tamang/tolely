import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { bookings, suppliers, users } from "@/server/collections";
import { adminAuth, db } from "@/server/firebase";
import { ApiError, type Caller } from "@/server/http";
import type { Language } from "@/shared/types";
import { OPEN_STATUSES } from "@/server/bookings/rules";
import type { CustomerProfileInput } from "./schemas";

/** The signed-in user's profile, plus their supplier record if they have one. */
export async function getSession(uid: string) {
  const [user, supplier] = await Promise.all([users().doc(uid).get(), suppliers().doc(uid).get()]);
  return {
    user: user.exists ? { uid, ...user.data() } : null,
    supplier: supplier.exists ? supplier.data() : null,
  };
}

/** Creates or updates the profile. New users start as customers. */
export async function saveCustomerProfile(caller: Caller, input: CustomerProfileInput) {
  const ref = users().doc(caller.uid);
  await ref.set(
    {
      ...input,
      phone: caller.phone,
      ...(caller.email ? { email: caller.email } : {}),
      ...(caller.role ? {} : { role: "customer", createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { uid: caller.uid, ...(await ref.get()).data() };
}

/**
 * Saves the preferred language (used for push notification text). Does nothing
 * until the person has a profile; the profile form saves their language too.
 */
export async function saveLanguage(caller: Caller, language: Language): Promise<boolean> {
  if (!caller.role) return false;
  await users().doc(caller.uid).update({ language, updatedAt: FieldValue.serverTimestamp() });
  return true;
}

/** Registers (or on logout, removes) a phone's push notification token. */
export async function setDeviceToken(caller: Caller, token: string, remove: boolean) {
  await users()
    .doc(caller.uid)
    .set({ fcmTokens: remove ? FieldValue.arrayRemove(token) : FieldValue.arrayUnion(token) }, { merge: true });
}

/**
 * Deletes the caller's account and profile. Past bookings stay for records.
 * Open bookings must be finished or cancelled first.
 */
export async function deleteAccount(caller: Caller) {
  if (caller.role === "admin") throw new ApiError(400, "Admin accounts are removed from the Firebase console");

  const [asCustomer, asSupplier] = await Promise.all([
    bookings().where("customerId", "==", caller.uid).where("status", "in", OPEN_STATUSES).limit(1).get(),
    bookings().where("supplierId", "==", caller.uid).where("status", "in", OPEN_STATUSES).limit(1).get(),
  ]);
  if (!asCustomer.empty || !asSupplier.empty) {
    throw new ApiError(409, "Finish or cancel your open bookings before deleting your account");
  }

  const batch = db().batch();
  batch.delete(users().doc(caller.uid));
  batch.delete(suppliers().doc(caller.uid));
  await batch.commit();
  await adminAuth().deleteUser(caller.uid);
}
