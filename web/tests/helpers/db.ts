import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { bookings, suppliers, users } from "@/server/collections";
import type { Caller } from "@/server/http";
import type { Role } from "@/shared/types";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;

/** Empties the emulator database so every test starts clean. */
export async function resetDb() {
  if (!emulator) throw new Error("Run integration tests with the Firestore emulator (npm run test:integration).");
  const project = process.env.FIREBASE_PROJECT_ID;
  const res = await fetch(`http://${emulator}/emulator/v1/projects/${project}/databases/(default)/documents`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Could not reset the emulator: ${res.status}`);
}

/** A signed-in person, as the routes would build them from a verified token. */
export function caller(
  uid: string,
  role: Role | null,
  phone: string | null = `+977980000${uid.slice(-4).padStart(4, "0")}`,
  signInProvider = "phone", // the app; the website signs in with "google.com"
): Caller {
  return { uid, role, phone, email: null, signInProvider };
}

export async function seedUser(uid: string, role: Role, extra: Record<string, unknown> = {}) {
  await users().doc(uid).set({ role, name: `User ${uid}`, language: "ne", ...extra });
}

export async function seedSupplier(uid: string, extra: Record<string, unknown> = {}) {
  await seedUser(uid, "supplier", { name: `Supplier ${uid}` });
  await suppliers().doc(uid).set({
    name: `Supplier ${uid}`,
    phone: `+977980000${uid.slice(-4).padStart(4, "0")}`,
    area: "Baneshwor",
    services: ["tanker"],
    vehicleNo: "Ba 1 Kha 2345",
    waterSource: "Well",
    verified: true,
    online: true,
    ratingSum: 0,
    ratingCount: 0,
    completedJobs: 0,
    createdAt: Timestamp.now(), // registered suppliers always have one; the admin list sorts by it
    ...extra,
  });
}

/** A booking in any state, written directly (to test later steps in isolation). */
export async function seedBooking(id: string, extra: Record<string, unknown> = {}) {
  await bookings()
    .doc(id)
    .set({
      customerId: "cust1",
      customerName: "Customer",
      customerPhone: "+9779800000001",
      serviceKey: "tanker",
      serviceNameEn: "Water Tanker",
      serviceNameNe: "पानी ट्याङ्कर",
      optionId: "8000L",
      optionLabelEn: "8,000 Liters",
      optionLabelNe: "८,००० लिटर",
      price: 3200,
      address: "Balkot",
      landmark: "",
      note: "",
      location: null,
      paymentMethod: "cash",
      scheduledFor: Timestamp.fromMillis(Date.now() + 3_600_000),
      status: "pending",
      supplierId: null,
      supplierName: null,
      supplierPhone: null,
      rating: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      ...extra,
    });
}

export async function read(collection: "bookings" | "suppliers" | "users" | "complaints" | "services", id: string) {
  const { db } = await import("@/server/firebase");
  return (await db().collection(collection).doc(id).get()).data();
}
