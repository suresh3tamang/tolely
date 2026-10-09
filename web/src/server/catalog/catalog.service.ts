import "server-only";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { serviceCatalog } from "@/server/collections";
import { db } from "@/server/firebase";
import { ApiError } from "@/server/http";
import { DEFAULT_SERVICES, type Service } from "@/shared/services";
import { SERVICE_KEY, type ServiceInput } from "./schemas";

export const CATALOG_TAG = "services";

/**
 * Reads the live catalog from Firestore, sorted by `order`. Falls back to the
 * defaults when Firebase isn't configured or no catalog has been saved yet.
 */
export async function loadCatalog({ fallbackOnError = false } = {}): Promise<Service[]> {
  if (!process.env.FIREBASE_PROJECT_ID) return DEFAULT_SERVICES;
  try {
    const snap = await serviceCatalog().orderBy("order").get();
    if (snap.empty) return DEFAULT_SERVICES;
    return snap.docs.map((d) => {
      const { key, nameEn, nameNe, icon, active, options } = d.data() as Service;
      return { key, nameEn, nameNe, icon, active, options };
    });
  } catch (err) {
    if (!fallbackOnError) throw err;
    console.error("Catalog read failed, using defaults", err);
    return DEFAULT_SERVICES;
  }
}

/** Cached catalog for public pages and the app's service list. */
export async function getCatalog(): Promise<Service[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  return loadCatalog({ fallbackOnError: true });
}

/** Looks up the current price for a booking. Always reads fresh data. */
export async function findOption(serviceKey: string, optionId: string) {
  const service = (await loadCatalog()).find((s) => s.key === serviceKey && s.active);
  const option = service?.options.find((o) => o.id === optionId);
  return service && option ? { service, option } : null;
}

/**
 * Creates or updates one service. The first save copies the default catalog
 * into Firestore so the other services don't disappear.
 */
export async function saveService(key: string, input: ServiceInput): Promise<void> {
  if (!SERVICE_KEY.test(key)) throw new ApiError(400, "Service key: lowercase letters, numbers and _ only");

  const col = serviceCatalog();
  const existing = await col.get();
  const batch = db().batch();
  if (existing.empty) {
    DEFAULT_SERVICES.forEach((s, order) => batch.set(col.doc(s.key), { ...s, order }));
  }
  // Keep a service's place in the list; new services go at the end.
  const defaultIndex = DEFAULT_SERVICES.findIndex((s) => s.key === key);
  const order =
    existing.docs.find((d) => d.id === key)?.get("order") ??
    (defaultIndex >= 0 ? defaultIndex : DEFAULT_SERVICES.length + existing.size);
  batch.set(col.doc(key), { key, ...input, order });
  await batch.commit();

  revalidateTag(CATALOG_TAG, "max");
}
