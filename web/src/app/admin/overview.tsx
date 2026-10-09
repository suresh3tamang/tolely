"use client";

import { CalendarCheck, ChevronRight, HandCoins, Hourglass, MessageSquareWarning, Star, UserCheck, Wallet, type LucideIcon } from "lucide-react";
import type { Section } from "./shell";
import type { Overview } from "./types";
import { Avatar, Card, EmptyState, StatusBadge, STATUS_LABELS, formatDate, plural, rupees } from "./ui";

const OPEN = ["pending", "accepted", "on_the_way"];

function Kpi({ icon: Icon, label, value, hint, tone }: { icon: LucideIcon; label: string; value: string | number; hint: string; tone: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex size-9 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </Card>
  );
}

export function OverviewPage({ data, now, go }: { data: Overview; now: number; go: (s: Section) => void }) {
  const { bookings, suppliers, complaints } = data;
  const completed = bookings.filter((b) => b.status === "completed");
  const open = bookings.filter((b) => OPEN.includes(b.status));
  const rated = completed.filter((b) => b.rating != null);
  const avgRating = rated.length ? (rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length).toFixed(1) : "—";
  const toVerify = suppliers.filter((s) => !s.verified);
  const openComplaints = complaints.filter((c) => c.status === "open");
  const owing = suppliers.filter((s) => (s.feeBalance ?? 0) > 0);
  const waitingLong = bookings.filter((b) => b.status === "pending" && now - new Date(b.createdAt).getTime() > 30 * 60 * 1000);

  const byStatus = Object.keys(STATUS_LABELS).map((s) => ({ status: s, count: bookings.filter((b) => b.status === s).length }));
  const maxCount = Math.max(1, ...byStatus.map((s) => s.count));

  const attention = [
    { count: toVerify.length, text: toVerify.length === 1 ? "supplier waiting for verification" : "suppliers waiting for verification", section: "suppliers" as const, icon: UserCheck },
    { count: openComplaints.length, text: openComplaints.length === 1 ? "open problem report" : "open problem reports", section: "complaints" as const, icon: MessageSquareWarning },
    { count: owing.length, text: owing.length === 1 ? "supplier owes platform fees" : "suppliers owe platform fees", section: "money" as const, icon: HandCoins },
    { count: waitingLong.length, text: `${waitingLong.length === 1 ? "booking" : "bookings"} waiting over 30 min for a supplier`, section: "bookings" as const, icon: Hourglass },
  ].filter((a) => a.count > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={CalendarCheck} label="Open bookings" value={open.length} hint={`${plural(bookings.length, "booking")} in total`} tone="bg-sky-50 text-sky-700" />
        <Kpi icon={Wallet} label="Completed job value" value={rupees(completed.reduce((s, b) => s + b.price, 0))} hint={`${plural(completed.length, "job")} completed`} tone="bg-emerald-50 text-emerald-700" />
        <Kpi icon={Star} label="Average rating" value={avgRating} hint={plural(rated.length, "rating")} tone="bg-amber-50 text-amber-700" />
        <Kpi icon={UserCheck} label="Verified suppliers" value={suppliers.length - toVerify.length} hint={`${toVerify.length} waiting for verification`} tone="bg-violet-50 text-violet-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Recent bookings</h2>
            <button onClick={() => go("bookings")} className="flex items-center gap-1 text-sm font-medium text-sky-700 hover:text-sky-800">
              View all <ChevronRight className="size-4" />
            </button>
          </div>
          {bookings.length ? (
            <ul className="divide-y divide-slate-100">
              {bookings.slice(0, 6).map((b) => (
                <li key={b.id} className="flex items-center gap-4 px-5 py-3">
                  <Avatar name={b.customerName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {b.serviceNameEn} <span className="font-normal text-slate-500">· {b.optionLabelEn}</span>
                    </p>
                    <p className="truncate text-xs text-slate-500">{b.customerName} · {formatDate(b.scheduledFor)}</p>
                  </div>
                  <span className="hidden text-sm font-medium text-slate-900 sm:block">{rupees(b.price)}</span>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={CalendarCheck} title="No bookings yet" text="Bookings from the app will appear here." />
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="border-b border-slate-100 px-5 py-4 font-semibold text-slate-900">Needs attention</h2>
            {attention.length ? (
              <ul className="divide-y divide-slate-100">
                {attention.map((a) => (
                  <li key={a.text}>
                    <button onClick={() => go(a.section)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                        <a.icon className="size-4" />
                      </span>
                      <span className="flex-1 text-sm text-slate-700">
                        <strong className="text-slate-900">{a.count}</strong> {a.text}
                      </span>
                      <ChevronRight className="size-4 text-slate-400" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-slate-500">All clear. Nothing needs your attention.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold text-slate-900">Bookings by status</h2>
            <ul className="mt-4 space-y-3">
              {byStatus.map((s) => (
                <li key={s.status}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-600">{STATUS_LABELS[s.status]}</span>
                    <span className="font-medium text-slate-900">{s.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-sky-600" style={{ width: `${(s.count / maxCount) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
