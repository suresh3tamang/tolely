"use client";

import { useState } from "react";
import type { Booking, Complaint, Supplier } from "./types";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-sky-100 text-sky-800",
  on_the_way: "bg-indigo-100 text-indigo-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-zinc-200 text-zinc-700",
};

const OPEN = ["pending", "accepted", "on_the_way"];

const th = "p-3 font-medium";
const td = "p-3 align-top";
const muted = "text-slate-500";

function Empty({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td className="p-6 text-slate-500" colSpan={cols}>{text}</td>
    </tr>
  );
}

export function BookingsTable({ bookings, onCancel }: { bookings: Booking[]; onCancel: (id: string) => void }) {
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = bookings.filter(
    (b) =>
      (status === "all" || (status === "open" ? OPEN.includes(b.status) : b.status === status)) &&
      (!q || [b.customerName, b.customerPhone, b.supplierName, b.address, b.id].some((v) => v?.toLowerCase().includes(q))),
  );

  return (
    <>
      <div className="flex flex-wrap gap-2 border-b p-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border px-2 py-1.5 text-sm">
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          {Object.keys(STATUS_STYLE).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, address, booking id"
          className="min-w-64 flex-1 rounded border px-3 py-1.5 text-sm"
        />
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b text-slate-500">
          <tr>
            <th className={th}>Service</th><th className={th}>Customer</th><th className={th}>Address</th>
            <th className={th}>Scheduled</th><th className={th}>Supplier</th><th className={th}>Price</th>
            <th className={th}>Status</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-b last:border-0">
              <td className={td}>{b.serviceNameEn}<div className={muted}>{b.optionLabelEn}</div></td>
              <td className={td}>{b.customerName}<div className={muted}>{b.customerPhone}</div></td>
              <td className={td}>
                {b.address}
                {b.landmark && <div className={muted}>{b.landmark}</div>}
                {b.note && <div className="italic text-slate-500">“{b.note}”</div>}
              </td>
              <td className={td}>{new Date(b.scheduledFor).toLocaleString()}</td>
              <td className={td}>{b.supplierName ?? "—"}<div className={muted}>{b.supplierPhone}</div></td>
              <td className={td}>Rs {b.price.toLocaleString("en-IN")}<div className={muted}>{b.paymentMethod}</div></td>
              <td className={td}>
                <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[b.status]}`}>
                  {b.status.replace(/_/g, " ")}
                </span>
                {b.rating != null && <div className="mt-1 text-amber-600">{"★".repeat(b.rating)}</div>}
              </td>
              <td className={`${td} text-right`}>
                {OPEN.includes(b.status) && (
                  <button onClick={() => onCancel(b.id)} className="rounded border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50">
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && <Empty cols={8} text="No bookings match." />}
        </tbody>
      </table>
    </>
  );
}

export function SuppliersTable({
  suppliers,
  onVerify,
}: {
  suppliers: Supplier[];
  onVerify: (uid: string, verified: boolean) => void;
}) {
  // Unverified first: they are waiting for us.
  const rows = [...suppliers].sort((a, b) => Number(a.verified) - Number(b.verified));
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b text-slate-500">
        <tr>
          <th className={th}>Name</th><th className={th}>Services</th><th className={th}>Area</th>
          <th className={th}>Vehicle / source</th><th className={th}>Rating</th><th className={th}>Jobs</th>
          <th className={th}></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s) => (
          <tr key={s.uid} className="border-b last:border-0">
            <td className={td}>
              {s.name}
              <div className={muted}>{s.phone}</div>
              {!s.verified && <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 text-xs text-amber-800">waiting</span>}
            </td>
            <td className={td}>{s.services.join(", ")}</td>
            <td className={td}>{s.area}</td>
            <td className={td}>{s.vehicleNo || "—"}<div className={muted}>{s.waterSource}</div></td>
            <td className={td}>{s.ratingCount ? `${(s.ratingSum / s.ratingCount).toFixed(1)} ★ (${s.ratingCount})` : "—"}</td>
            <td className={td}>{s.completedJobs}</td>
            <td className={`${td} text-right`}>
              {s.verified ? (
                <button onClick={() => onVerify(s.uid, false)} className="rounded border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50">
                  Suspend
                </button>
              ) : (
                <button onClick={() => onVerify(s.uid, true)} className="rounded bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700">
                  Verify
                </button>
              )}
            </td>
          </tr>
        ))}
        {!rows.length && <Empty cols={7} text="No suppliers yet." />}
      </tbody>
    </table>
  );
}

export function ComplaintsList({
  complaints,
  onResolve,
}: {
  complaints: Complaint[];
  onResolve: (id: string) => void;
}) {
  const rows = [...complaints].sort((a, b) => Number(a.status === "resolved") - Number(b.status === "resolved"));
  return (
    <ul className="divide-y">
      {rows.map((c) => (
        <li key={c.id} className="flex flex-wrap items-start justify-between gap-4 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-500">
              {c.serviceNameEn} · booking {c.bookingId} · from {c.reporterRole} {c.reporterPhone} ·{" "}
              {new Date(c.createdAt).toLocaleString()}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{c.message}</p>
            {c.resolution && <p className="mt-2 text-sm text-emerald-700">Resolved: {c.resolution}</p>}
          </div>
          {c.status === "open" ? (
            <button onClick={() => onResolve(c.id)} className="rounded bg-sky-700 px-3 py-1 text-sm text-white hover:bg-sky-800">
              Resolve
            </button>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">resolved</span>
          )}
        </li>
      ))}
      {!rows.length && <li className="p-6 text-slate-500">No problem reports. 🎉</li>}
    </ul>
  );
}
