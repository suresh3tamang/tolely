import { Timestamp } from "firebase-admin/firestore";
import { handle, requireRole } from "@/lib/api";
import { loadCatalog } from "@/lib/catalog";
import { db } from "@/lib/firebase-admin";

// Firestore Timestamps -> ISO strings so the dashboard gets plain JSON.
function plain(data: FirebaseFirestore.DocumentData) {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v instanceof Timestamp ? v.toDate().toISOString() : v]),
  );
}

export const GET = handle(async (req: Request) => {
  await requireRole(req, "admin");
  const [bookings, suppliers, complaints, services] = await Promise.all([
    db().collection("bookings").orderBy("createdAt", "desc").limit(200).get(),
    db().collection("suppliers").orderBy("createdAt", "desc").get(),
    db().collection("complaints").orderBy("createdAt", "desc").limit(200).get(),
    loadCatalog(),
  ]);
  return Response.json({
    bookings: bookings.docs.map((d) => ({ id: d.id, ...plain(d.data()) })),
    suppliers: suppliers.docs.map((d) => ({ uid: d.id, ...plain(d.data()) })),
    complaints: complaints.docs.map((d) => ({ id: d.id, ...plain(d.data()) })),
    services,
  });
});
