"use client";

import { collection, limit, onSnapshot, orderBy, query, where, type DocumentData, type Timestamp } from "firebase/firestore";
import { BadgeCheck, CalendarClock, MapPin, Phone, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch, clientDb } from "@/client/firebase";
import { useI18n } from "@/client/i18n/provider";
import type { Strings } from "@/client/i18n/strings";
import { Button, Card, EmptyState, Modal, inputClass, rupees, useToast } from "@/components/ui";
import { CalendarCheck } from "lucide-react";

type Status = "pending" | "accepted" | "on_the_way" | "completed" | "cancelled";

export type WebBooking = {
  id: string;
  status: Status;
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
};

function toBooking(id: string, d: DocumentData): WebBooking {
  return {
    id,
    status: d.status,
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
  const locale = lang === "ne" ? "ne-NP-u-nu-latn" : "en-GB";
  const day = date.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  const time = (d: Date) => d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  return end ? `${day}, ${time(date)} – ${time(end)}` : `${day}, ${time(date)}`;
}

/** The customer's bookings, updated live straight from the database. */
export function MyBookings({ uid, onBookFirst }: { uid: string; onBookFirst: () => void }) {
  const { t } = useI18n();
  const [bookings, setBookings] = useState<WebBooking[] | null>(null);
  const [error, setError] = useState("");

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

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">{t("liveNote")}</p>
      {bookings.map((b) => (
        <BookingCard key={b.id} booking={b} />
      ))}
      <p className="pt-2 text-center text-sm text-slate-500">{t("getAppNote")}</p>
    </div>
  );
}

export function BookingCard({ booking: b }: { booking: WebBooking }) {
  const { t, lang, pick } = useI18n();
  const toast = useToast();
  const [dialog, setDialog] = useState<"cancel" | "report" | null>(null);
  const status = STATUS_STYLE[b.status];
  const open = b.status === "pending" || b.status === "accepted" || b.status === "on_the_way";

  async function rate(stars: number) {
    try {
      await apiFetch(`/api/bookings/${b.id}/rate`, { method: "POST", body: JSON.stringify({ rating: stars }) });
      toast("success", t("thanksRating"));
    } catch (e) {
      toast("error", (e as Error).message);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {pick(b as unknown as Record<string, unknown>, "serviceName")}
            <span className="font-normal text-slate-500"> · {pick(b as unknown as Record<string, unknown>, "optionLabel")}</span>
          </h3>
          <p className="mt-1 text-xl font-bold text-slate-900">{rupees(b.price)}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${status.className}`}>
          {t(status.label)}
        </span>
      </div>

      <dl className="mt-4 space-y-2 text-sm text-slate-600">
        <div className="flex gap-2">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-slate-400" />
          <dd>{formatWhen(b.scheduledFor, lang, b.scheduledEnd)}</dd>
        </div>
        <div className="flex gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
          <dd>
            {[b.address, b.landmark].filter(Boolean).join(" · ")}
            {b.location && (
              <>
                {" "}
                <a
                  href={`https://www.google.com/maps?q=${b.location.lat},${b.location.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-sky-700 underline"
                >
                  {t("viewOnMap")}
                </a>
              </>
            )}
          </dd>
        </div>
      </dl>

      {b.status === "pending" && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{t("pendingNote")}</p>}

      {b.supplierName && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
          <div>
            <p className="flex items-center gap-1.5 font-medium text-slate-900">
              {b.supplierName}
              <BadgeCheck className="size-4 text-emerald-600" aria-label="Verified" />
            </p>
            <p className="flex items-center gap-1 text-sm text-slate-500">
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
          {b.supplierPhone && (
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
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-700">{b.rating == null ? t("rateThis") : t("thanksRating")}</p>
          <div className="mt-1 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                disabled={b.rating != null}
                onClick={() => rate(n)}
                aria-label={`${n}`}
                className="rounded p-1 enabled:hover:bg-amber-50 disabled:cursor-default"
              >
                <Star className={`size-7 ${n <= (b.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {(b.status === "pending" || b.status === "accepted") && (
          <Button variant="danger" size="sm" onClick={() => setDialog("cancel")}>
            {t("cancelBooking")}
          </Button>
        )}
        {(open || b.status === "completed") && (
          <Button variant="ghost" size="sm" onClick={() => setDialog("report")}>
            {t("reportProblem")}
          </Button>
        )}
      </div>

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
