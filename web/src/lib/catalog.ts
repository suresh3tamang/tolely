import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./firebase-admin";
import { DEFAULT_SERVICES, type Service } from "./services";

export const CATALOG_TAG = "services";

/**
 * Reads the live catalog from Firestore, sorted by `order`. Falls back to the
 * defaults when Firebase isn't configured or no catalog has been saved yet.
 */
export async function loadCatalog({ fallbackOnError = false } = {}): Promise<Service[]> {
  if (!process.env.FIREBASE_PROJECT_ID) return DEFAULT_SERVICES;
  try {
    const snap = await db().collection("services").orderBy("order").get();
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
