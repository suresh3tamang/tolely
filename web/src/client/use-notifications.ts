"use client";

import { collection, limit, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, clientDb } from "@/client/firebase";

export type AppNotification = {
  id: string;
  type: string;
  bookingId: string | null;
  titleEn: string;
  titleNe: string;
  bodyEn: string;
  bodyNe: string;
  seen: boolean;
  createdAt: Date | null;
};

/**
 * The person's notifications (the bell), live from the database, newest first.
 * `onNew` is called for each notification that arrives while the page is open (not for older ones).
 */
export function useNotifications(uid: string, onNew?: (n: AppNotification) => void) {
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const onNewRef = useRef(onNew);
  useEffect(() => {
    onNewRef.current = onNew;
  });

  useEffect(() => {
    let first = true;
    const q = query(collection(clientDb(), "users", uid, "notifications"), orderBy("createdAt", "desc"), limit(30));
    return onSnapshot(
      q,
      (snap) => {
        if (!first) {
          for (const change of snap.docChanges()) {
            if (change.type === "added" && !change.doc.data().seen) onNewRef.current?.(toNotification(change.doc.id, change.doc.data()));
          }
        }
        first = false;
        setItems(snap.docs.map((d) => toNotification(d.id, d.data())));
      },
      (err) => console.error("Could not load notifications", err),
    );
  }, [uid]);

  const unseen = items?.filter((n) => !n.seen) ?? [];
  const unseenIds = unseen.map((n) => n.id).join(",");

  /** Marks them seen (on the server), so the count goes away everywhere, including the app. */
  const markAllSeen = useCallback(async () => {
    if (!unseenIds) return;
    await apiFetch("/api/me/notifications/seen", { method: "POST", body: JSON.stringify({ ids: unseenIds.split(",") }) }).catch(
      () => undefined,
    );
  }, [unseenIds]);

  return { items, unseenCount: unseen.length, markAllSeen };
}

function toNotification(id: string, d: Record<string, unknown>): AppNotification {
  return {
    id,
    type: String(d.type ?? "info"),
    bookingId: (d.bookingId as string | null) ?? null,
    titleEn: String(d.titleEn ?? ""),
    titleNe: String(d.titleNe ?? ""),
    bodyEn: String(d.bodyEn ?? ""),
    bodyNe: String(d.bodyNe ?? ""),
    seen: d.seen === true,
    // Just written: the server time arrives a moment later.
    createdAt: (d.createdAt as Timestamp | null)?.toDate() ?? new Date(),
  };
}
