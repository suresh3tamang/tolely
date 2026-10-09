import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { inbox } from "@/server/collections";
import { db } from "@/server/firebase";
import { notifyUser, type Message } from "./notify";

// The bell: every notification for a person is also kept in users/{uid}/notifications, so the app and the
// website can list them, count the unseen ones, and show them even when a push didn't arrive.

/** Saves a notification in the person's inbox, then sends it as a push. Never throws. */
export async function tell(uid: string | null | undefined, msg: Message) {
  if (!uid) return;
  try {
    await inbox(uid).add({
      type: msg.type ?? "info",
      bookingId: msg.bookingId ?? null,
      titleEn: msg.titleEn,
      titleNe: msg.titleNe,
      bodyEn: msg.bodyEn,
      bodyNe: msg.bodyNe,
      seen: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error("inbox write failed", err);
  }
  await notifyUser(uid, msg);
}

/** Marks notifications as seen: the given ones, or all unseen ones. */
export async function markSeen(uid: string, ids: string[] | "all") {
  const docs =
    ids === "all"
      ? (await inbox(uid).where("seen", "==", false).limit(400).get()).docs.map((d) => d.ref)
      : ids.slice(0, 400).map((id) => inbox(uid).doc(id));
  if (!docs.length) return 0;
  const batch = db().batch();
  for (const ref of docs) batch.update(ref, { seen: true, seenAt: FieldValue.serverTimestamp() });
  await batch.commit().catch(async (err) => {
    // An unknown id would fail the whole batch; mark the ones that exist instead.
    if (ids === "all") throw err;
    await Promise.all(docs.map((ref) => ref.update({ seen: true, seenAt: FieldValue.serverTimestamp() }).catch(() => undefined)));
  });
  return docs.length;
}
