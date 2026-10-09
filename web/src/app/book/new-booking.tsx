"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/client/firebase";
import { useI18n } from "@/client/i18n/provider";
import { ServiceGlyph } from "@/components/service-icons";
import { Button, Card, inputClass, rupees, useToast } from "@/components/ui";
import { isInNepal, type LatLng } from "@/shared/geo";
import type { Service } from "@/shared/services";
import { LocationPicker } from "./location-picker-lazy";
import { VoiceBooking, type VoiceDraft } from "./voice-booking";
import { availableSlots, isToday, lastBookableDay, nextDays, slotLabel, windowFor, type SlotId } from "@/shared/schedule";

/** The time right now (kept out of the component so rendering stays pure). */
function currentTime(): number {
  return Date.now();
}

/** A numbered step of the form: a heading the customer can follow from top to bottom. */
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="flex items-center gap-3 text-lg font-semibold text-slate-900">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-700 text-sm font-bold text-white">{n}</span>
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** A pill the customer taps to choose (a day, a time window, a payment method). */
function Chip({ selected, onClick, children, disabled }: { selected: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-4 py-2.5 text-sm font-medium transition disabled:opacity-40 ${
        selected ? "border-sky-600 bg-sky-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-sky-300"
      }`}
    >
      {children}
    </button>
  );
}

/** "+9779800000001" -> "9800000001". */
function localDigits(phone: string): string {
  return phone.replace(/^\+977/, "").replace(/\D/g, "");
}

export function NewBooking({
  defaultAddress,
  defaultLandmark,
  defaultName = "",
  defaultPhone = "",
  onBooked,
}: {
  defaultAddress: string;
  defaultLandmark: string;
  defaultName?: string;
  defaultPhone?: string;
  onBooked: () => void;
}) {
  const { t, pick, lang } = useI18n();
  const toast = useToast();
  const [services, setServices] = useState<Service[] | null>(null);
  const [serviceKey, setServiceKey] = useState("");
  const [optionId, setOptionId] = useState("");
  // The moment the form was opened; booking times are checked against it.
  const [openedAt] = useState(() => Date.now());
  const [location, setLocation] = useState<LatLng | null>(null);
  // The day and the time window ("12 PM – 3 PM"). Today, if anything is left of it; otherwise tomorrow.
  const [day, setDay] = useState(() => {
    const now = Date.now();
    return availableSlots(nextDays(now)[0], now).length ? nextDays(now)[0] : nextDays(now)[1];
  });
  const [slot, setSlot] = useState<SlotId | "">("");
  const [otherDate, setOtherDate] = useState(false);
  const [contactName, setContactName] = useState(defaultName);
  const [contactPhone, setContactPhone] = useState(localDigits(defaultPhone));
  const [address, setAddress] = useState(defaultAddress);
  const [landmark, setLandmark] = useState(defaultLandmark);
  const [payment, setPayment] = useState<"cash" | "qr">("cash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Set when the form was filled in by voice: shows a short "check and confirm" card.
  const [fromVoice, setFromVoice] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/services")
      .then((r) => r.json())
      .then((data: { services: Service[] }) => !cancelled && setServices(data.services))
      .catch(() => !cancelled && setServices([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const service = services?.find((s) => s.key === serviceKey);
  const option = service?.options.find((o) => o.id === optionId);
  const quickDays = nextDays(openedAt, 2);
  const slots = availableSlots(day, openedAt);
  const chosen = slot ? windowFor(day, slot, openedAt) : null;
  const phoneOk = contactPhone.length >= 8 && contactPhone.length <= 10;
  const contactOk = contactName.trim().length >= 2 && phoneOk;
  const inNepal = !location || isInNepal(location);
  const ready = !!service && !!option && !!chosen && contactOk && address.trim().length >= 3 && !!location && inNepal;

  function dayName(key: string): string {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (key === quickDays[0]) return t("today");
    if (key === quickDays[1]) return t("tomorrow");
    return date.toLocaleDateString(lang === "ne" ? "ne-NP-u-nu-latn" : "en-GB", { weekday: "short", day: "numeric", month: "short" });
  }
  const summary = chosen && slot ? t("summaryWhen", { day: dayName(day), time: slotLabel(slot, t("asap")) }) : "";

  function chooseService(s: Service) {
    setServiceKey(s.key);
    setOptionId(s.options[0].id); // the first option is preselected; one tap to change
  }

  /** Fills the form from what the customer said. Only what they actually said is changed. */
  function applyDraft(draft: VoiceDraft, done: boolean) {
    const s = services?.find((x) => x.key === draft.serviceKey);
    if (s) {
      setServiceKey(s.key);
      setOptionId(s.options.find((o) => o.id === draft.optionId)?.id ?? s.options[0].id);
    }
    if (draft.date) {
      setDay(draft.date);
      setOtherDate(!quickDays.includes(draft.date));
      setSlot(draft.slot && availableSlots(draft.date, currentTime()).includes(draft.slot) ? draft.slot : "");
    } else if (draft.slot && availableSlots(day, currentTime()).includes(draft.slot)) {
      setSlot(draft.slot);
    }
    if (draft.contactName) setContactName(draft.contactName);
    if (draft.contactPhone) setContactPhone(draft.contactPhone);
    if (draft.note) setNote((n) => (n ? `${n}\n${draft.note}` : draft.note));
    setFromVoice(!!s && done);
  }

  async function book() {
    if (!service || !option || !slot) return;
    const window = windowFor(day, slot, currentTime()); // checked again now: the form may have been open a while
    if (!window) return setError(t("timeExpired"));
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          serviceKey: service.key,
          optionId: option.id,
          address: address.trim(),
          landmark: landmark.trim(),
          scheduledFor: window.start.toISOString(),
          scheduledEnd: window.end.toISOString(),
          contactName: contactName.trim(),
          contactPhone: `+977${contactPhone}`,
          paymentMethod: payment,
          note: note.trim(),
          location,
        }),
      });
      toast("success", t("booked"));
      onBooked();
    } catch (e) {
      setError((e as Error).message || t("somethingWrong"));
    } finally {
      setBusy(false);
    }
  }

  if (services === null) return <p className="py-12 text-center text-slate-500">{t("loadingServices")}</p>;
  if (!services.length) return <p className="py-12 text-center text-slate-500">{t("noServices")}</p>;

  return (
    <form
      className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 pb-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) book();
      }}
    >
      <div className="space-y-3 lg:col-span-2">
        <VoiceBooking onDraft={applyDraft} />
        {fromVoice && service && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-2 ring-sky-500">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                <ServiceGlyph name={service.icon} className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-sky-700 uppercase">{t("voiceReady")}</p>
                <p className="truncate font-semibold text-slate-900">
                  {pick(service, "name")}
                  {option && service.options.length > 1 && ` · ${pick(option, "label")}`}
                  {option && ` · ${rupees(option.price)}`}
                </p>
                <p className="truncate text-sm text-slate-600">
                  {summary || t("timeRequired")}
                  {contactName && ` · ${contactName} (${contactPhone})`}
                </p>
                {!location && <p className="text-sm text-amber-700">{t("voiceMissingPin")}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setFromVoice(false)}>
                {t("voiceEdit")}
              </Button>
              <Button type="button" loading={busy} disabled={!ready} onClick={() => void book()}>
                {t("confirmBooking")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* The map stays in view on wide screens while the rest of the form scrolls beside it. */}
      <div className="lg:sticky lg:top-4">
        <Step n={1} title={t("locationTitle")}>
          <Card className="p-3">
            <LocationPicker value={location} onChange={setLocation} />
          </Card>
          {!inNepal && <p className="mt-2 text-sm text-red-600">{t("locationOutside")}</p>}
        </Step>
      </div>

      <div className="min-w-0 space-y-9">
        <Step n={2} title={t("whatDoYouNeed")}>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {services.map((s) => {
              const selected = s.key === serviceKey;
              const cheapest = Math.min(...s.options.map((o) => o.price));
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => chooseService(s)}
                  className={`flex items-center gap-3 rounded-xl border bg-white p-3 text-left transition hover:border-sky-300 ${
                    selected ? "border-sky-500 bg-sky-50/50 ring-4 ring-sky-500/15" : "border-slate-200"
                  }`}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                    <ServiceGlyph name={s.icon} className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-900">{pick(s, "name")}</span>
                    <span className="block text-sm text-slate-500">{t("fromPrice", { price: rupees(cheapest) })}</span>
                  </span>
                  {selected && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white">
                      <Check className="size-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {service && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-slate-700">{t("chooseOption")}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {service.options.map((o) => (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 ${
                      o.id === optionId ? "border-sky-500 ring-4 ring-sky-500/15" : "border-slate-200"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input type="radio" name="option" checked={o.id === optionId} onChange={() => setOptionId(o.id)} className="size-4 accent-sky-700" />
                      {pick(o, "label")}
                    </span>
                    <span className="font-semibold text-slate-900">{rupees(o.price)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </Step>

        {service && (
          <>
            <Step n={3} title={t("whenTitle")}>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("when")}>
                {quickDays.map((key) => (
                  <Chip
                    key={key}
                    selected={!otherDate && day === key}
                    onClick={() => {
                      setOtherDate(false);
                      setDay(key);
                      setSlot("");
                    }}
                  >
                    {dayName(key)}
                  </Chip>
                ))}
                <Chip selected={otherDate} onClick={() => setOtherDate(true)}>
                  {t("otherDate")}
                </Chip>
              </div>
              {otherDate && (
                <input
                  type="date"
                  aria-label={t("pickDate")}
                  className={`${inputClass} mt-3 max-w-xs`}
                  value={day}
                  min={quickDays[0]}
                  max={lastBookableDay(openedAt)}
                  onChange={(e) => {
                    if (e.target.value) setDay(e.target.value);
                    setSlot("");
                  }}
                />
              )}

              <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("stepWhen")}>
                {slots.map((id) => (
                  <Chip key={id} selected={slot === id} onClick={() => setSlot(id)}>
                    {slotLabel(id, t("asap"))}
                  </Chip>
                ))}
              </div>
              {!slots.length && <p className="mt-2 text-sm text-amber-700">{t("noSlotsToday")}</p>}
              {slots.length > 0 && !slot && <p className="mt-2 text-sm text-slate-500">{t("timeRequired")}</p>}
              {isToday(day, openedAt) && slot === "asap" && <p className="mt-2 text-sm text-slate-500">{t("timeHint")}</p>}
            </Step>

            <Step n={4} title={t("contactTitle")}>
              <Card className="space-y-5 p-5">
                <div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">{t("contactName")}</span>
                      <input className={`${inputClass} h-11`} value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={80} autoComplete="name" />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">{t("contactPhone")}</span>
                      <span className="flex h-11 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/10">
                        <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">🇳🇵 +977</span>
                        <input
                          className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                          type="tel"
                          inputMode="numeric"
                          value={contactPhone}
                          maxLength={10}
                          onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, ""))}
                          autoComplete="tel-national"
                          aria-label={t("contactPhone")}
                        />
                      </span>
                    </label>
                  </div>
                  {contactPhone && !phoneOk ? (
                    <p className="mt-2 text-xs text-red-600">{t("contactInvalid")}</p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">{t("contactHint")}</p>
                  )}
                </div>
                <div className="border-t border-slate-100 pt-5">
                  <p className="mb-3 text-sm font-semibold text-slate-900">{t("addressSection")}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">{t("addressLabel")}</span>
                      <input className={`${inputClass} h-11`} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">{t("landmarkLabel")}</span>
                      <input className={`${inputClass} h-11`} placeholder={t("landmarkPlaceholder")} value={landmark} onChange={(e) => setLandmark(e.target.value)} maxLength={200} />
                    </label>
                  </div>
                </div>
              </Card>
            </Step>

            <Step n={5} title={t("stepPay")}>
              <Card className="space-y-5 p-5">
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-slate-700">{t("payment")}</legend>
                  <div className="flex flex-wrap gap-2">
                    {(["cash", "qr"] as const).map((method) => (
                      <Chip key={method} selected={payment === method} onClick={() => setPayment(method)}>
                        {t(method)}
                      </Chip>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{t("paymentNote")}</p>
                </fieldset>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">{t("noteLabel")}</span>
                  <textarea className={inputClass} rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
                </label>
              </Card>
            </Step>

            {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            {!location && <p className="text-sm text-amber-700">{t("locationRequired")}</p>}

            {/* Stays at the bottom of the screen so the price and the button are always in reach. */}
            <div className="sticky bottom-3 z-10 flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-200">
              <div className="min-w-0">
                <p className="text-sm text-slate-500">{t("total")}</p>
                <p className="text-2xl font-bold text-slate-900">{option ? rupees(option.price) : "—"}</p>
                {summary && <p className="truncate text-xs text-slate-500">{summary}</p>}
              </div>
              <Button type="submit" className="h-12 px-8 text-base" loading={busy} disabled={!ready}>
                {busy ? t("booking") : t("confirmBooking")}
              </Button>
            </div>
          </>
        )}
      </div>
    </form>
  );
}
