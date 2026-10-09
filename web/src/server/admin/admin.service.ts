import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { loadCatalog } from "@/server/catalog/catalog.service";
import { bookings, complaints, settlements, suppliers } from "@/server/collections";
import { ApiError, type Caller } from "@/server/http";
import { getSettings } from "@/server/settings/settings.service";

// Firestore Timestamps -> ISO strings so the dashboard gets plain JSON.
function plain(data: FirebaseFirestore.DocumentData) {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v instanceof Timestamp ? v.toDate().toISOString() : v]),
  );
}

/** Everything the admin console shows on load. */
export async function loadOverview() {
  const [allBookings, allSuppliers, allComplaints, allSettlements, services, appSettings] = await Promise.all([
    bookings().orderBy("createdAt", "desc").limit(200).get(),
    suppliers().orderBy("createdAt", "desc").get(),
    complaints().orderBy("createdAt", "desc").limit(200).get(),
    settlements().orderBy("createdAt", "desc").limit(100).get(),
    loadCatalog(),
    getSettings(),
  ]);
  return {
    bookings: allBookings.docs.map((d) => ({ id: d.id, ...plain(d.data()) })),
    suppliers: allSuppliers.docs.map((d) => ({ uid: d.id, ...plain(d.data()) })),
    complaints: allComplaints.docs.map((d) => ({ id: d.id, ...plain(d.data()) })),
    settlements: allSettlements.docs.map((d) => ({ id: d.id, ...plain(d.data()) })),
    services,
    settings: appSettings,
  };
}

/** Admin closes a complaint with a note about what was done. */
export async function resolveComplaint(admin: Caller, id: string, resolution: string) {
  const ref = complaints().doc(id);
  if (!(await ref.get()).exists) throw new ApiError(404, "Complaint not found");
  await ref.update({
    status: "resolved",
    resolution,
    resolvedBy: admin.uid,
    resolvedAt: FieldValue.serverTimestamp(),
  });
}
