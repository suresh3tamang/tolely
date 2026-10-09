"use client";

import { collection, limit, onSnapshot, orderBy, query, where, type DocumentData, type Timestamp } from "firebase/firestore";
import { BadgeCheck, CalendarClock, MapPin, Phone, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, clientDb } from "@/client/firebase";
import { useI18n } from "@/client/i18n/provider";
import type { Strings } from "@/client/i18n/strings";
import { Button, Card, EmptyState, Modal, inputClass, rupees, useToast } from "@/components/ui";
import { CalendarCheck } from "lucide-react";
import { ServiceGlyph } from "@/components/service-icons";
import { formatWindow } from "@/shared/dates";
import { distanceKm, etaMinutes } from "@/shared/geo";
import { DEFAULT_SERVICES } from "@/shared/services";
import { LiveTracking, StatusNotes, Timeline } from "./tracking";

type Status = "pending" | "accepted" | "on_the_way" | "completed" | "cancelled";

export type WebBooking = {
  id: string;
  status: Status;
  serviceKey?: string;
  serviceNameEn: string;
  serviceNameNe: string;
  optionLabelEn: string;
  optionLabelNe: string;
  price: number;
  address: string;
  landmark: string;
  scheduledFor: Date | null;
  scheduledEnd: Date | null;
  contactName: string;
  contactPhone: string;
  location: { lat: number; lng: number } | null;
  supplierName: string | null;
  supplierPhone: string | null;
  vehicleNo: string | null;
  supplierRating: number | null;
  supplierRatingCount: number;
  supplierJobs: number;
  rating: number | null;
  createdAt: Date | null;
  acceptedAt: Date | null;
  departedAt: Date | null;
  arrivedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  /** Where the supplier is, while on the way (live). */
  supplierLocation: { lat: number; lng: number; at: Date | null } | null;
  lateByMinutes: number | null;
};

const date = (v: unknown) => (v as Timestamp | undefined)?.toDate?.() ?? null;

function toBooking(id: string, d: DocumentData): WebBooking {
  return {
    id,
    status: d.status,
    serviceKey: d.serviceKey ?? "",
    serviceNameEn: d.serviceNameEn ?? "",
    serviceNameNe: d.serviceNameNe ?? "",
    optionLabelEn: d.optionLabelEn ?? "",
    optionLabelNe: d.optionLabelNe ?? "",
    price: d.price ?? 0,
    address: d.address ?? "",
    landmark: d.landmark ?? "",
    scheduledFor: (d.scheduledFor as Timestamp | undefined)?.toDate() ?? null,
    scheduledEnd: (d.scheduledEnd as Timestamp | undefined)?.toDate() ?? null,
    contactName: d.contactName ?? "",
    contactPhone: d.contactPhone ?? "",
    location: typeof d.location?.lat === "number" && typeof d.location?.lng === "number" ? { lat: d.location.lat, lng: d.location.lng } : null,
    supplierName: d.supplierName ?? null,
    supplierPhone: d.supplierPhone ?? null,
    vehicleNo: d.vehicleNo ?? null,
    supplierRating: typeof d.supplierRating === "number" ? d.supplierRating : null,
    supplierRatingCount: d.supplierRatingCount ?? 0,
    supplierJobs: d.supplierJobs ?? 0,
    rating: typeof d.rating === "number" ? d.rating : null,
    createdAt: date(d.createdAt),
    acceptedAt: date(d.acceptedAt),
    departedAt: date(d.departedAt),
    arrivedAt: date(d.arrivedAt),
    completedAt: date(d.completedAt),
    cancelledAt: date(d.cancelledAt),
    supplierLocation:
      typeof d.supplierLocation?.lat === "number" && typeof d.supplierLocation?.lng === "number"
        ? { lat: d.supplierLocation.lat, lng: d.supplierLocation.lng, at: date(d.supplierLocation.at) }
        : null,
    lateByMinutes: typeof d.lateByMinutes === "number" ? d.lateByMinutes : null,
  };
}

const STATUS_STYLE: Record<Status, { label: keyof Strings; className: string }> = {
  pending: { label: "statusPending", className: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  accepted: { label: "statusAccepted", className: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  on_the_way: { label: "statusOnTheWay", className: "bg-indigo-50 text-indigo-700 ring-indigo-600/20" },
  completed: { label: "statusCompleted", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  cancelled: { label: "statusCancelled", className: "bg-slate-100 text-slate-600 ring-slate-500/20" },
};

function formatWhen(date: Date | null, lang: string, end: Date | null = null) {
  if (!date) return "—";
  return formatWindow(date, end, lang === "ne" ? "ne" : "en");
}

const OPEN: Status[] = ["pending", "accepted", "on_the_way"];

function iconFor(serviceKey: string | undefined) {
  return DEFAULT_SERVICES.find((s) => s.key === serviceKey)?.icon ?? "handyman";
}

/** The customer's bookings, updated live: active ones and past ones, a list and the chosen booking's details. */
export function MyBookings({ uid, onBookFirst }: { uid: string; onBookFirst: () => void }) {
  const { t } = useI18n();
  const [bookings, setBookings] = useState<WebBooking[] | null>(null);
  const [error, setError] = useState("");
  // Re-checked every minute: "delayed" notes and "updated 2 min ago" depend on the time.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(collection(clientDb(), "bookings"), where("customerId", "==", uid), orderBy("createdAt", "desc"), limit(50));
    return onSnapshot(
      q,
      (snap) => {
        setBookings(snap.docs.map((d) => toBooking(d.id, d.data())));
        setError("");
      },
      (err) => {
        console.error("Could not load bookings", err);
        setError(t("somethingWrong"));
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconnect only when the person changes
  }, [uid]);

  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (bookings === null) return <p className="py-12 text-center text-slate-500">{t("loading")}</p>;
  if (!bookings.length) {
    return (
      <Card>
        <EmptyState icon={CalendarCheck} title={t("noBookings")} />
        <div className="pb-8 text-center">
          <Button onClick={onBookFirst}>{t("bookFirst")}</Button>
        </div>
      </Card>
    );
  }

  return <BookingsView bookings={bookings} now={now} onBookFirst={onBookFirst} />;
}

/** Tabs (active / past), the list, and the chosen booking's details. Draws only: the data comes from `MyBookings`. */
export function BookingsView({ bookings, now, onBookFirst }: { bookings: WebBooking[]; now: number; onBookFirst: () => void }) {
  const { t } = useI18n();
  const [view, setView] = useState<"active" | "past" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const active = bookings.filter((b) => OPEN.includes(b.status));
  const past = bookings.filter((b) => !OPEN.includes(b.status));
  const shown = view ?? (active.length ? "active" : "past");
  const list = shown === "active" ? active : past;
  const selected = list.find((b) => b.id === selectedId) ?? list[0] ?? null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200" role="tablist">
          {(["active", "past"] as const).map((id) => {
            const count = id === "active" ? active.length : past.length;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={shown === id}
                onClick={() => {
                  setView(id);
                  setSelectedId(null);
                }}
                className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium ${
                  shown === id ? "bg-sky-700 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t(id === "active" ? "bookingsActive" : "bookingsPast")}
                <span className={`rounded-full px-1.5 text-xs ${shown === id ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="size-2 animate-pulse rounded-full bg-emerald-500" aria-hidden /> {t("liveNote")}
        </p>
      </div>

      {!list.length ? (
        <Card className="p-8 text-center">
          <p className="text-slate-600">{t(shown === "active" ? "nothingActive" : "nothingPast")}</p>
          {shown === "active" && (
            <Button className="mt-4" onClick={onBookFirst}>
              {t("bookFirst")}
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <ul className="space-y-2">
            {list.map((b) => (
              <li key={b.id}>
                <BookingRow booking={b} selected={b.id === selected?.id} onSelect={() => setSelectedId(b.id)} now={now} />
                {/* On phones the details open right under the chosen booking. */}
                {b.id === selected?.id && (
                  <div className="mt-2 lg:hidden">
                    <BookingCard booking={b} now={now} compact />
                  </div>
                )}
              </li>
            ))}
          </ul>
          {selected && (
            <div className="hidden lg:sticky lg:top-4 lg:block">
              <BookingCard booking={selected} now={now} />
            </div>
          )}
        </div>
      )}
      <p className="pt-6 text-center text-sm text-slate-500">{t("getAppNote")}</p>
    </div>
  );
}

/** One line in the list: what, when, status, price. */
function BookingRow({ booking: b, selected, onSelect, now }: { booking: WebBooking; selected: boolean; onSelect: () => void; now: number }) {
  const { t, lang, pick } = useI18n();
  const status = STATUS_STYLE[b.status];
  const live = b.status === "on_the_way" && !b.arrivedAt;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected}
      className={`flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm ring-1 transition ${
        selected ? "ring-2 ring-sky-500" : "ring-slate-200 hover:ring-sky-300"
      }`}
    >
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${OPEN.includes(b.status) ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-500"}`}>
        <ServiceGlyph name={iconFor(b.serviceKey)} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-slate-900">{pick(b as unknown as Record<string, unknown>, "serviceName")}</span>
          <span className="shrink-0 font-semibold text-slate-900">{rupees(b.price)}</span>
        </span>
        <span className="block truncate text-sm text-slate-500">
          {pick(b as unknown as Record<string, unknown>, "optionLabel")} · {formatWhen(b.scheduledFor, lang, b.scheduledEnd)}
        </span>
        <span className="mt-1 flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${status.className}`}>
            {b.arrivedAt && b.status === "on_the_way" ? t("tlArrived") : t(status.label)}
          </span>
          {live && b.supplierLocation && b.location && (
            <span className="truncate text-xs font-medium text-indigo-700">
              {t("etaAway", { min: etaMinutes(b.supplierLocation, b.location), km: distanceKm(b.supplierLocation, b.location).toFixed(1) })}
            </span>
          )}
          {isDelayed(b, now) && <span className="text-xs font-medium text-red-600">{t("delayedShort")}</span>}
        </span>
      </span>
    </button>
  );
}

function isDelayed(b: WebBooking, now: number) {
  const end = b.scheduledEnd ?? b.scheduledFor;
  return now > 0 && (b.status === "pending" || b.status === "accepted") && !!end && end.getTime() + (b.lateByMinutes ?? 0) * 60_000 < now;
}

/** One booking in full: where it is now, the map while on the way, the supplier, and what can be done. */
export function BookingCard({ booking: b, now = 0, compact = false }: { booking: WebBooking; now?: number; compact?: boolean }) {
  const { t, lang, pick } = useI18n();
  const toast = useToast();
  const [dialog, setDialog] = useState<"cancel" | "report" | null>(null);
  const status = STATUS_STYLE[b.status];
  const open = OPEN.includes(b.status);

  async function rate(stars: number) {
    try {
      await apiFetch(`/api/bookings/${b.id}/rate`, { method: "POST", body: JSON.stringify({ rating: stars }) });
      toast("success", t("thanksRating"));
    } catch (e) {
      toast("error", (e as Error).message);
    }
  }

  return (
    <Card className="overflow-hidden">
      {/* On phones the row above already shows the title, price and status. */}
      <div className={`items-start justify-between gap-3 border-b border-slate-100 p-5 ${compact ? "hidden" : "flex"}`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <ServiceGlyph name={iconFor(b.serviceKey)} className="size-6" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-slate-900">
              {pick(b as unknown as Record<string, unknown>, "serviceName")}
              <span className="font-normal text-slate-500"> · {pick(b as unknown as Record<string, unknown>, "optionLabel")}</span>
            </h3>
            <p className="text-xl font-bold text-slate-900">{rupees(b.price)}</p>
          </div>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${status.className}`}>
          {t(status.label)}
        </span>
      </div>

      <div className={`space-y-4 ${compact ? "p-4" : "p-5"}`}>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex gap-2.5">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-slate-400" />
            <div>
              <dt className="text-xs text-slate-500">{t("detailsWhen")}</dt>
              <dd className="font-medium text-slate-800">{formatWhen(b.scheduledFor, lang, b.scheduledEnd)}</dd>
            </div>
          </div>
          <div className="flex gap-2.5">
            <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">{t("detailsWhere")}</dt>
              <dd className="font-medium text-slate-800">
                {[b.address, b.landmark].filter(Boolean).join(" · ")}
                {b.location && (
                  <a
                    href={`https://www.google.com/maps?q=${b.location.lat},${b.location.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-xs font-medium text-sky-700 hover:underline"
                  >
                    {t("viewOnMap")} <span aria-hidden>↗</span>
                  </a>
                )}
              </dd>
            </div>
          </div>
        </dl>

        {b.status === "pending" && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{t("pendingNote")}</p>}
        <StatusNotes booking={b} now={now} />
        <LiveTracking booking={b} />
        <Timeline booking={b} />

        {b.supplierName && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-700 text-sm font-semibold text-white">
                {b.supplierName
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-medium text-slate-900">
                  {b.supplierName}
                  <BadgeCheck className="size-4 text-emerald-600" aria-label="Verified" />
                </p>
                <p className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
                  {b.supplierRating != null ? (
                    <>
                      <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      {b.supplierRating.toFixed(1)} ({b.supplierRatingCount})
                    </>
                  ) : (
                    t("newSupplier")
                  )}
                  {b.supplierJobs > 0 && <> · {b.supplierJobs === 1 ? t("jobsOne") : t("jobsMany", { count: b.supplierJobs })}</>}
                  {b.vehicleNo && <> · {b.vehicleNo}</>}
                </p>
              </div>
            </div>
            {b.supplierPhone && open && (
              <a
                href={`tel:${b.supplierPhone}`}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-sky-700 px-4 text-sm font-medium text-white hover:bg-sky-800"
              >
                <Phone className="size-4" />
                {t("call")}
              </a>
            )}
          </div>
        )}

        {b.status === "completed" && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-slate-700">{b.rating == null ? t("rateThis") : t("thanksRating")}</p>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  disabled={b.rating != null}
                  onClick={() => rate(n)}
                  aria-label={`${n}`}
                  className="rounded p-1 enabled:hover:bg-amber-50 disabled:cursor-default"
                >
                  <Star className={`size-6 ${n <= (b.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {(open || b.status === "completed") && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <Button variant="ghost" size="sm" onClick={() => setDialog("report")}>
            {t("reportProblem")}
          </Button>
          {(b.status === "pending" || b.status === "accepted") && (
            <Button variant="danger" size="sm" onClick={() => setDialog("cancel")}>
              {t("cancelBooking")}
            </Button>
          )}
        </div>
      )}

      {dialog === "cancel" && <CancelDialog id={b.id} onClose={() => setDialog(null)} />}
      {dialog === "report" && <ReportDialog id={b.id} onClose={() => setDialog(null)} />}
    </Card>
  );
}

function CancelDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function cancel() {
    setBusy(true);
    try {
      await apiFetch(`/api/bookings/${id}/cancel`, { method: "POST" });
      onClose();
    } catch (e) {
      toast("error", (e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title={t("cancelAsk")} onClose={onClose}>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          {t("keepIt")}
        </Button>
        <Button variant="danger" loading={busy} onClick={cancel}>
          {t("cancelBooking")}
        </Button>
      </div>
    </Modal>
  );
}

function ReportDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    try {
      await apiFetch(`/api/bookings/${id}/report`, { method: "POST", body: JSON.stringify({ message: message.trim() }) });
      toast("success", t("reportSent"));
      onClose();
    } catch (e) {
      toast("error", (e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title={t("reportProblem")} onClose={onClose}>
      <textarea
        className={inputClass}
        rows={4}
        autoFocus
        maxLength={1000}
        placeholder={t("reportPlaceholder")}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button loading={busy} disabled={message.trim().length < 5} onClick={send}>
          {t("send")}
        </Button>
      </div>
    </Modal>
  );
}
