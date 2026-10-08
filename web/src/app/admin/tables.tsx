"use client";

import { CalendarCheck, Droplets, MapPin, MessageSquareWarning, Phone, Search, ShieldCheck, Star, Truck } from "lucide-react";
import { useState } from "react";
import type { Booking, Complaint, Supplier } from "./types";
import { Avatar, Badge, Button, Card, EmptyState, StatusBadge, STATUS_LABELS, formatDate, inputClass, rupees } from "./ui";

const OPEN = ["pending", "accepted", "on_the_way"];
const th = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500";
const td = "px-4 py-3.5 align-top";

function Filters({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
      <div className="relative min-w-60 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search…" className={`${inputClass} pl-9`} />
      </div>
      {children}
    </div>
  );
}

function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="flex rounded-lg bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${value === o.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          {o.label}
          {o.count != null && <span className="ml-1.5 text-xs text-slate-400">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function BookingsTable({ bookings, onCancel }: { bookings: Booking[]; onCancel: (b: Booking) => void }) {
  const [status, setStatus] = useState("open");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = bookings.filter(
    (b) =>
      (status === "all" || (status === "open" ? OPEN.includes(b.status) : b.status === status)) &&
      (!q || [b.customerName, b.customerPhone, b.supplierName, b.address, b.serviceNameEn, b.id].some((v) => v?.toLowerCase().includes(q))),
  );

  return (
    <Card>
      <Filters value={query} onChange={setQuery}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass.replace("w-full", "w-48")}>
          <option value="open">Open bookings</option>
          <option value="all">All bookings</option>
          {Object.entries(STATUS_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </Filters>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60">
              <tr>
                <th className={th}>Service</th><th className={th}>Customer</th><th className={th}>When</th>
                <th className={th}>Supplier</th><th className={th}>Amount</th><th className={th}>Status</th><th className={th}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/60">
                  <td className={td}>
                    <p className="font-medium text-slate-900">{b.serviceNameEn}</p>
                    <p className="text-slate-500">{b.optionLabelEn}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">{b.id}</p>
                  </td>
                  <td className={td}>
                    <div className="flex gap-3">
                      <Avatar name={b.customerName} />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{b.customerName}</p>
                        <p className="flex items-center gap-1 text-slate-500"><Phone className="size-3" />{b.customerPhone}</p>
                        <p className="flex items-start gap-1 text-slate-500">
                          <MapPin className="mt-0.5 size-3 shrink-0" />
                          <span>{b.address}{b.landmark && ` · ${b.landmark}`}</span>
                        </p>
                        {b.location && (
                          <a
                            href={`https://www.google.com/maps?q=${b.location.lat},${b.location.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline"
                          >
                            <MapPin className="size-3" /> View on map
                          </a>
                        )}
                        {b.note && <p className="mt-1 text-xs italic text-slate-500">“{b.note}”</p>}
                      </div>
                    </div>
                  </td>
                  <td className={`${td} whitespace-nowrap text-slate-700`}>{formatDate(b.scheduledFor)}</td>
                  <td className={td}>
                    {b.supplierName ? (
                      <>
                        <p className="font-medium text-slate-900">{b.supplierName}</p>
                        <p className="text-slate-500">{b.supplierPhone}</p>
                      </>
                    ) : (
                      <span className="text-slate-400">Not assigned</span>
                    )}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    <p className="font-medium text-slate-900">{rupees(b.price)}</p>
                    <p className="text-xs text-slate-500">{b.paymentMethod === "qr" ? "QR payment" : "Cash"}</p>
                  </td>
                  <td className={td}>
                    <StatusBadge status={b.status} />
                    {b.rating != null && (
                      <p className="mt-1.5 flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: b.rating }, (_, i) => <Star key={i} className="size-3 fill-current" />)}
                      </p>
                    )}
                  </td>
                  <td className={`${td} text-right`}>
                    {OPEN.includes(b.status) && (
                      <Button variant="danger" size="sm" onClick={() => onCancel(b)}>Cancel</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={CalendarCheck} title="No bookings found" text={bookings.length ? "Try a different filter or search." : "Bookings from the app will appear here."} />
      )}
    </Card>
  );
}

export function SuppliersTable({ suppliers, onVerify }: { suppliers: Supplier[]; onVerify: (s: Supplier, verified: boolean) => void }) {
  const [filter, setFilter] = useState<"waiting" | "verified" | "all">("waiting");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const waiting = suppliers.filter((s) => !s.verified).length;
  const rows = suppliers.filter(
    (s) =>
      (filter === "all" || (filter === "waiting" ? !s.verified : s.verified)) &&
      (!q || [s.name, s.phone, s.area, s.vehicleNo].some((v) => v?.toLowerCase().includes(q))),
  );

  return (
    <Card>
      <Filters value={query} onChange={setQuery}>
        <Tabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: "waiting", label: "Waiting", count: waiting },
            { value: "verified", label: "Verified", count: suppliers.length - waiting },
            { value: "all", label: "All", count: suppliers.length },
          ]}
        />
      </Filters>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60">
              <tr>
                <th className={th}>Supplier</th><th className={th}>Services</th><th className={th}>Tanker details</th>
                <th className={th}>Rating</th><th className={th}>Jobs</th><th className={th}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((s) => (
                <tr key={s.uid} className="hover:bg-slate-50/60">
                  <td className={td}>
                    <div className="flex gap-3">
                      <Avatar name={s.name} />
                      <div>
                        <p className="flex items-center gap-1.5 font-medium text-slate-900">
                          {s.name}
                          {s.verified && <ShieldCheck className="size-4 text-emerald-600" aria-label="Verified" />}
                        </p>
                        <p className="text-slate-500">{s.phone}</p>
                        <p className="flex items-center gap-1 text-slate-500"><MapPin className="size-3" />{s.area}</p>
                      </div>
                    </div>
                  </td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      {s.services.map((k) => <Badge key={k} className="bg-slate-50 text-slate-700 ring-slate-500/20">{k.replace(/_/g, " ")}</Badge>)}
                    </div>
                  </td>
                  <td className={td}>
                    {s.vehicleNo ? (
                      <>
                        <p className="flex items-center gap-1 font-medium text-slate-900"><Truck className="size-3.5" />{s.vehicleNo}</p>
                        <p className="flex items-center gap-1 text-slate-500"><Droplets className="size-3.5" />{s.waterSource}</p>
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className={td}>
                    {s.ratingCount ? (
                      <span className="flex items-center gap-1 font-medium text-slate-900">
                        <Star className="size-4 fill-amber-400 text-amber-400" />
                        {(s.ratingSum / s.ratingCount).toFixed(1)}
                        <span className="font-normal text-slate-500">({s.ratingCount})</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">No ratings</span>
                    )}
                  </td>
                  <td className={`${td} font-medium text-slate-900`}>{s.completedJobs}</td>
                  <td className={`${td} text-right`}>
                    {s.verified ? (
                      <Button variant="danger" size="sm" onClick={() => onVerify(s, false)}>Suspend</Button>
                    ) : (
                      <Button variant="success" size="sm" icon={ShieldCheck} onClick={() => onVerify(s, true)}>Verify</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={Truck}
          title={filter === "waiting" ? "No suppliers waiting" : "No suppliers found"}
          text={filter === "waiting" ? "New supplier sign-ups from the app will appear here for verification." : undefined}
        />
      )}
    </Card>
  );
}

export function ComplaintsList({ complaints, onResolve }: { complaints: Complaint[]; onResolve: (c: Complaint) => void }) {
  const [filter, setFilter] = useState<"open" | "resolved">("open");
  const open = complaints.filter((c) => c.status === "open").length;
  const rows = complaints.filter((c) => c.status === filter);

  return (
    <Card>
      <div className="border-b border-slate-100 p-4">
        <Tabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: "open", label: "Open", count: open },
            { value: "resolved", label: "Resolved", count: complaints.length - open },
          ]}
        />
      </div>
      {rows.length ? (
        <ul className="divide-y divide-slate-100">
          {rows.map((c) => (
            <li key={c.id} className="flex flex-wrap items-start gap-4 p-5">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${c.status === "open" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                <MessageSquareWarning className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-slate-900">{c.serviceNameEn}</span>
                  <Badge className="bg-slate-50 text-slate-600 ring-slate-500/20">from {c.reporterRole}</Badge>
                  <span className="text-slate-500">{c.reporterPhone} · {formatDate(c.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-slate-700">{c.message}</p>
                <p className="mt-1 font-mono text-[11px] text-slate-400">Booking {c.bookingId}</p>
                {c.resolution && (
                  <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    <strong>Resolved:</strong> {c.resolution}
                  </p>
                )}
              </div>
              {c.status === "open" && <Button size="sm" onClick={() => onResolve(c)}>Mark resolved</Button>}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={MessageSquareWarning}
          title={filter === "open" ? "No open problem reports" : "Nothing resolved yet"}
          text={filter === "open" ? "Reports sent from the app will appear here." : undefined}
        />
      )}
    </Card>
  );
}
