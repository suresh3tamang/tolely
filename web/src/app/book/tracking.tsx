"use client";

import { Check, Clock, MapPin, Navigation } from "lucide-react";
import { useI18n } from "@/client/i18n/provider";
import { formatShortDateTime } from "@/shared/dates";
import { distanceKm, etaMinutes } from "@/shared/geo";
import type { WebBooking } from "./my-bookings";
import { useTimeAgo } from "./notification-bell";
import { TrackingMap } from "./tracking-map-lazy";

type Step = { label: string; at: Date | null; done: boolean };

/** Who accepted and when, when they left, arrived and finished: one line per step. */
export function Timeline({ booking: b }: { booking: WebBooking }) {
  const { t, lang } = useI18n();
  const time = (d: Date | null) =>
    d ? formatShortDateTime(d, lang === "ne" ? "ne" : "en") : "";

  const steps: Step[] =
    b.status === "cancelled"
      ? [
          { label: t("tlBooked"), at: b.createdAt, done: true },
          { label: t("tlCancelled"), at: b.cancelledAt, done: true },
        ]
      : [
          { label: t("tlBooked"), at: b.createdAt, done: true },
          b.supplierName
            ? { label: t("tlAcceptedShort"), at: b.acceptedAt, done: true }
            : { label: t("tlWaiting"), at: null, done: false },
          { label: t("tlOnTheWay"), at: b.departedAt, done: !!b.departedAt },
          { label: t("tlArrived"), at: b.arrivedAt, done: !!b.arrivedAt },
          { label: t("tlCompleted"), at: b.completedAt, done: b.status === "completed" },
        ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <ol className="grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((s, i) => (
        <li key={i} className="relative flex flex-col items-center text-center">
          {i > 0 && (
            <span className={`absolute top-3 right-1/2 h-0.5 w-full ${s.done ? "bg-sky-600" : "bg-slate-200"}`} aria-hidden />
          )}
          <span
            className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full ${
              s.done ? "bg-sky-600 text-white" : i === current ? "bg-white ring-2 ring-sky-600" : "bg-white ring-2 ring-slate-200"
            }`}
          >
            {s.done && <Check className="size-3.5" />}
            {!s.done && i === current && <span className="size-2 animate-pulse rounded-full bg-sky-600" />}
          </span>
          <span
            className={`mt-1.5 text-xs leading-tight ${
              s.done ? "font-medium text-slate-900" : i === current ? "font-medium text-sky-800" : "text-slate-400"
            }`}
          >
            {s.label}
          </span>
          {s.at && <span className="mt-0.5 text-[11px] text-slate-500">{time(s.at)}</span>}
        </li>
      ))}
    </ol>
  );
}

/** Late, delayed and arrived notes for an open booking. */
export function StatusNotes({ booking: b, now }: { booking: WebBooking; now: number }) {
  const { t } = useI18n();
  const end = b.scheduledEnd ?? b.scheduledFor;
  const delayed = now > 0 && (b.status === "pending" || b.status === "accepted") && !!end && end.getTime() + (b.lateByMinutes ?? 0) * 60_000 < now;
  return (
    <>
      {b.arrivedAt && b.status === "on_the_way" && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          <MapPin className="size-4" /> {t("arrivedNote", { name: b.supplierName ?? "" })}
        </p>
      )}
      {!b.arrivedAt && b.lateByMinutes != null && (b.status === "accepted" || b.status === "on_the_way") && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <Clock className="size-4" /> {t("lateBy", { min: b.lateByMinutes })}
        </p>
      )}
      {delayed && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <Clock className="size-4" /> {t("delayed")}
        </p>
      )}
    </>
  );
}

/** While the supplier is on the way: the map with both places, distance and a rough time to arrive. */
export function LiveTracking({ booking: b }: { booking: WebBooking }) {
  const { t } = useI18n();
  const ago = useTimeAgo();
  if (b.status !== "on_the_way" || b.arrivedAt) return null;
  const here = b.supplierLocation;

  return (
    <div className="space-y-2">
      <TrackingMap home={b.location} supplier={here} />
      {here && b.location ? (
        <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-1.5 font-medium text-slate-900">
            <Navigation className="size-4 text-amber-500" />
            {t("etaAway", { min: etaMinutes(here, b.location), km: distanceKm(here, b.location).toFixed(1) })}
          </span>
          {here.at && <span className="text-xs text-slate-500">{t("liveUpdated", { ago: ago(here.at) })}</span>}
        </p>
      ) : (
        <p className="text-sm text-slate-500">{t("liveWaiting")}</p>
      )}
    </div>
  );
}
