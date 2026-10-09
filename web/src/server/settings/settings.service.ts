import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { settings } from "@/server/collections";
import type { Caller } from "@/server/http";
import type { Settings } from "./schemas";

const DOC = "app";

/** Business settings an admin can change. Everything defaults to "off". */
export async function getSettings(): Promise<Settings> {
  const doc = await settings().doc(DOC).get();
  const percent = doc.get("platformFeePercent");
  return { platformFeePercent: typeof percent === "number" && percent > 0 ? percent : 0 };
}

export async function saveSettings(admin: Caller, input: Settings): Promise<Settings> {
  await settings()
    .doc(DOC)
    .set({ ...input, updatedBy: admin.uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return getSettings();
}
