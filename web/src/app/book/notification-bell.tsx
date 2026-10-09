"use client";

import { Bell, BellRing, CheckCircle2, Clock, MapPin, Truck, XCircle, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/client/i18n/provider";
import { formatDay } from "@/shared/dates";
import { useNotifications, type AppNotification } from "@/client/use-notifications";

const ICONS: Record<string, LucideIcon> = {
  accepted: CheckCircle2,
  on_the_way: Truck,
  near: MapPin,
  arrived: MapPin,
  completed: CheckCircle2,
  cancelled: XCircle,
  late: Clock,
  delayed: Clock,
};

/** "5 min ago". */
export function useTimeAgo() {
  const { t, lang } = useI18n();
  return (date: Date | null) => {
    if (!date) return "";
    const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
    if (minutes < 1) return t("justNow");
    if (minutes < 60) return t("minutesAgo", { n: minutes });
    if (minutes < 24 * 60) return t("hoursAgo", { n: Math.round(minutes / 60) });
    return formatDay(date, lang === "ne" ? "ne" : "en");
  };
}

function browserNotificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * The bell: every update about the customer's bookings, with a count of the unseen ones.
 * Opening it marks them seen. While the page is open, new ones also show in the tab title ("(1) On the way")
 * and as a browser notification (when allowed).
 */
export function NotificationBell({ uid, onOpenBooking }: { uid: string; onOpenBooking: () => void }) {
  const { t, lang } = useI18n();
  const ago = useTimeAgo();
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const panel = useRef<HTMLDivElement>(null);
  const title = (n: AppNotification) => (lang === "ne" ? n.titleNe : n.titleEn);
  const body = (n: AppNotification) => (lang === "ne" ? n.bodyNe : n.bodyEn);

  const { items, unseenCount, markAllSeen } = useNotifications(uid, (n) => {
    // A browser notification when the person is on another tab or window.
    if (browserNotificationsSupported() && Notification.permission === "granted" && document.hidden) {
      const note = new Notification(title(n), { body: body(n), icon: "/icon.png", tag: n.id });
      note.onclick = () => {
        window.focus();
        onOpenBooking();
        note.close();
      };
    }
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- only known in the browser
    setPermission(browserNotificationsSupported() ? Notification.permission : "unsupported");
  }, []);

  // The tab title shows the count and the newest unseen update: "(2) On the way · Tolely".
  useEffect(() => {
    const base = "Book a service · Tolely";
    const newest = items?.find((n) => !n.seen);
    document.title = unseenCount && newest ? `(${unseenCount}) ${title(newest)} · Tolely` : base;
    return () => {
      document.title = base;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- title() depends on lang only
  }, [items, unseenCount, lang]);

  // Close when clicking elsewhere.
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !panel.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void markAllSeen(); // seen once opened: the count goes away
  }

  async function allowBrowser() {
    if (!browserNotificationsSupported()) return;
    setPermission(await Notification.requestPermission());
  }

  const Icon = unseenCount ? BellRing : Bell;
  return (
    <div className="relative" ref={panel}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unseenCount ? `${t("bellTitle")} (${unseenCount})` : t("bellTitle")}
        aria-expanded={open}
        className="relative flex size-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
      >
        <Icon className={`size-5 ${unseenCount ? "text-sky-700" : ""}`} />
        {unseenCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("bellTitle")}
          className="absolute right-0 z-[1000] mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="font-semibold text-slate-900">{t("bellTitle")}</p>
          </div>
          <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
            {items?.length ? (
              items.map((n) => {
                const ItemIcon = ICONS[n.type] ?? Bell;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        if (n.bookingId) onOpenBooking();
                      }}
                      className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 ${n.seen ? "" : "bg-sky-50/60"}`}
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <ItemIcon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{title(n)}</span>
                          {!n.seen && <span className="size-2 rounded-full bg-sky-600" aria-hidden />}
                        </span>
                        <span className="block text-sm text-slate-600">{body(n)}</span>
                        <span className="block text-xs text-slate-400">{ago(n.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-4 py-8 text-center text-sm text-slate-500">{t("bellEmpty")}</li>
            )}
          </ul>
          {permission !== "unsupported" && (
            <div className="border-t border-slate-100 px-4 py-3 text-sm">
              {permission === "granted" && <p className="text-emerald-700">{t("bellBrowserOn")}</p>}
              {permission === "denied" && <p className="text-slate-500">{t("bellBrowserBlocked")}</p>}
              {permission === "default" && (
                <button type="button" onClick={allowBrowser} className="font-medium text-sky-700 hover:underline">
                  {t("bellAllowBrowser")}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
