import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { loadCatalog } from "@/server/catalog/catalog.service";
import { settlements, suppliers, users } from "@/server/collections";
import { db } from "@/server/firebase";
import { ApiError, assertSupplierChannel, type Caller } from "@/server/http";
import type { SupplierInput } from "./schemas";

/** Services that need a vehicle number and water source before approval. */
const TANKER_KEY = "tanker";

/**
 * Registers the caller as a service provider. Every registration or update
 * puts the supplier back to unverified until an admin checks them.
 */
export async function registerSupplier(caller: Caller, input: SupplierInput) {
  if (caller.role === "admin") throw new ApiError(400, "Admins cannot register as suppliers");
  assertSupplierChannel(caller); // suppliers sign up in the app, not on the website

  const known = new Set((await loadCatalog()).map((s) => s.key));
  if (input.services.some((key) => !known.has(key))) throw new ApiError(400, "Unknown service");
  if (input.services.includes(TANKER_KEY) && (!input.vehicleNo || !input.waterSource)) {
    throw new ApiError(400, "Tanker suppliers must add vehicle number and water source");
  }

  const { language, ...details } = input;
  const supplierRef = suppliers().doc(caller.uid);
  const existing = await supplierRef.get();

  const batch = db().batch();
  batch.set(
    users().doc(caller.uid),
    {
      role: "supplier",
      name: details.name,
      phone: caller.phone,
      ...(language ? { language } : {}),
      updatedAt: FieldValue.serverTimestamp(),
      ...(caller.role ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  batch.set(
    supplierRef,
    {
      ...details,
      phone: caller.phone,
      verified: false,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists
        ? {}
        : { ratingSum: 0, ratingCount: 0, completedJobs: 0, createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  await batch.commit();

  return (await supplierRef.get()).data();
}

/** Supplier goes online (gets new-job alerts) or offline. */
export async function setOnline(caller: Caller, online: boolean) {
  await suppliers().doc(caller.uid).update({ online, onlineChangedAt: FieldValue.serverTimestamp() });
}

/** Admin approves (or suspends) a supplier after checking their documents. */
export async function setVerified(admin: Caller, supplierUid: string, verified: boolean) {
  const ref = suppliers().doc(supplierUid);
  if (!(await ref.get()).exists) throw new ApiError(404, "Supplier not found");
  await ref.update({ verified, verifiedBy: admin.uid, verifiedAt: FieldValue.serverTimestamp() });
}

/**
 * The admin records that a supplier paid Tolely some of the platform fees they
 * owe (for example by bank transfer). The amount cannot be more than they owe.
 */
export async function recordSettlement(admin: Caller, supplierUid: string, amount: number, note: string) {
  const ref = suppliers().doc(supplierUid);
  return db().runTransaction(async (tx) => {
    const supplier = await tx.get(ref);
    if (!supplier.exists) throw new ApiError(404, "Supplier not found");
    const owed: number = supplier.get("feeBalance") ?? 0;
    if (amount > owed) throw new ApiError(400, `This supplier only owes Rs ${owed}`);

    tx.update(ref, { feeBalance: FieldValue.increment(-amount), feesSettled: FieldValue.increment(amount) });
    tx.set(settlements().doc(), {
      supplierId: supplierUid,
      supplierName: supplier.get("name") ?? "",
      amount,
      note,
      recordedBy: admin.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { balance: owed - amount };
  });
}
