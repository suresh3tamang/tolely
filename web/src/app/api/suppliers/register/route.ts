import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { ApiError, getCaller, handle, parseBody } from "@/lib/api";
import { db } from "@/lib/firebase-admin";
import { loadCatalog } from "@/lib/catalog";

const SupplierSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  area: z.string().trim().min(2, "Working area is required").max(120),
  services: z.array(z.string()).min(1, "Choose at least one service").max(20),
  vehicleNo: z.string().trim().max(30).default(""),
  waterSource: z.string().trim().max(200).default(""),
});

/**
 * Registers the caller as a service provider. Every registration or update
 * puts the supplier back to unverified until an admin checks them.
 */
export const POST = handle(async (req: Request) => {
  const caller = await getCaller(req);
  if (caller.role === "admin") throw new ApiError(400, "Admins cannot register as suppliers");
  const body = await parseBody(req, SupplierSchema);
  const known = new Set((await loadCatalog()).map((s) => s.key));
  if (body.services.some((key) => !known.has(key))) throw new ApiError(400, "Unknown service");
  if (body.services.includes("tanker") && (!body.vehicleNo || !body.waterSource)) {
    throw new ApiError(400, "Tanker suppliers must add vehicle number and water source");
  }

  const firestore = db();
  const supplierRef = firestore.collection("suppliers").doc(caller.uid);
  const existing = await supplierRef.get();

  const batch = firestore.batch();
  batch.set(
    firestore.collection("users").doc(caller.uid),
    {
      role: "supplier",
      name: body.name,
      phone: caller.phone,
      updatedAt: FieldValue.serverTimestamp(),
      ...(caller.role ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  batch.set(
    supplierRef,
    {
      ...body,
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

  return Response.json({ supplier: (await supplierRef.get()).data() });
});
