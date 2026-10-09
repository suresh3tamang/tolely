import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { users } from "@/server/collections";
import { messaging } from "@/server/firebase";

export type Message = { titleEn: string; titleNe: string; bodyEn: string; bodyNe: string; bookingId?: string; type?: string };

// Notifications are best-effort: a failure here must never fail the request.

/** Sends a push to every device of one user, in their language. */
export async function notifyUser(uid: string | null | undefined, msg: Message) {
  if (!uid) return;
  try {
    const user = await users().doc(uid).get();
    const tokens = (user.get("fcmTokens") as string[] | undefined) ?? [];
    if (!tokens.length) return;
    const ne = user.get("language") !== "en";

    const res = await messaging().sendEachForMulticast({
      tokens,
      notification: { title: ne ? msg.titleNe : msg.titleEn, body: ne ? msg.bodyNe : msg.bodyEn },
      data: msg.bookingId ? { bookingId: msg.bookingId } : {},
    });

    // Forget tokens of uninstalled apps.
    const dead = tokens.filter((_, i) => {
      const code = res.responses[i].error?.code;
      return code === "messaging/registration-token-not-registered" || code === "messaging/invalid-argument";
    });
    if (dead.length) await user.ref.update({ fcmTokens: FieldValue.arrayRemove(...dead) });
  } catch (err) {
    console.error("notifyUser failed", err);
  }
}

/** Tells suppliers of a service that a new job is open. Verified suppliers subscribe to `jobs_<service>`. */
export async function notifySuppliers(serviceKey: string, msg: Message) {
  try {
    await messaging().send({
      topic: `jobs_${serviceKey}`,
      notification: { title: `${msg.titleNe} · ${msg.titleEn}`, body: msg.bodyNe },
      data: msg.bookingId ? { bookingId: msg.bookingId } : {},
    });
  } catch (err) {
    console.error("notifySuppliers failed", err);
  }
}
