"use client";

import { Download, HandCoins, Percent, Receipt, Wallet, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { apiFetch } from "@/client/firebase";
import { bookingsToCsv } from "./csv";
import type { Booking, Overview, Supplier } from "./types";
import { Avatar, Button, Card, EmptyState, Modal, formatDate, inputClass, rupees, useToast } from "./ui";

function Kpi({ icon: Icon, label, value, hint, tone }: { icon: LucideIcon; label: string; value: string; hint: string; tone: string }) {
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

/** Platform fee, what each supplier owes, payments received, and a spreadsheet export. */
export function MoneyPage({ data, onChanged }: { data: Overview; onChanged: () => void }) {
  const [paying, setPaying] = useState<Supplier | null>(null);

  const totals = data.suppliers.reduce(
    (sum, s) => ({
      earned: sum.earned + (s.feesTotal ?? 0),
      received: sum.received + (s.feesSettled ?? 0),
      owed: sum.owed + (s.feeBalance ?? 0),
      paidToSuppliers: sum.paidToSuppliers + (s.earningsTotal ?? 0),
    }),
    { earned: 0, received: 0, owed: 0, paidToSuppliers: 0 },
  );
  const withBalance = data.suppliers.filter((s) => (s.feeBalance ?? 0) > 0).sort((a, b) => (b.feeBalance ?? 0) - (a.feeBalance ?? 0));

  return (
    <div className="space-y-6">
      <FeeSetting percent={data.settings.platformFeePercent} onSaved={onChanged} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Receipt} label="Fees earned" value={rupees(totals.earned)} hint="From all completed jobs" tone="bg-sky-50 text-sky-700" />
        <Kpi icon={HandCoins} label="Fees received" value={rupees(totals.received)} hint="Paid to you by suppliers" tone="bg-emerald-50 text-emerald-700" />
        <Kpi icon={Wallet} label="Still owed to you" value={rupees(totals.owed)} hint={`${withBalance.length} supplier${withBalance.length === 1 ? "" : "s"} owe fees`} tone="bg-amber-50 text-amber-700" />
        <Kpi icon={Percent} label="Suppliers earned" value={rupees(totals.paidToSuppliers)} hint="After Tolely's fee" tone="bg-violet-50 text-violet-700" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Fees suppliers owe</h2>
            <p className="text-sm text-slate-500">Customers pay the supplier directly, so each supplier owes Tolely the fee on their jobs.</p>
          </div>
          <Button variant="secondary" icon={Download} onClick={() => exportBookings(data.bookings)} disabled={!data.bookings.length}>
            Export bookings (CSV)
          </Button>
        </div>
        {withBalance.length ? (
          <ul className="divide-y divide-slate-100">
            {withBalance.map((s) => (
              <li key={s.uid} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                <Avatar name={s.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{s.name}</p>
                  <p className="text-sm text-slate-500">
                    {s.completedJobs} job{s.completedJobs === 1 ? "" : "s"} · fees {rupees(s.feesTotal ?? 0)} · paid {rupees(s.feesSettled ?? 0)}
                  </p>
                </div>
                <p className="text-lg font-semibold text-slate-900">{rupees(s.feeBalance ?? 0)}</p>
                <Button size="sm" onClick={() => setPaying(s)}>Record payment</Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Wallet}
            title="Nobody owes fees"
            text={data.settings.platformFeePercent > 0 ? "Fees appear here as suppliers complete jobs." : "The fee is off. Set a percentage above and completed jobs will start to add up here."}
          />
        )}
      </Card>

      <Card>
        <h2 className="border-b border-slate-100 px-5 py-4 font-semibold text-slate-900">Payments received</h2>
        {data.settlements.length ? (
          <ul className="divide-y divide-slate-100">
            {data.settlements.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="font-medium text-slate-900">{p.supplierName}</p>
                  <p className="text-sm text-slate-500">{formatDate(p.createdAt)}{p.note && ` · ${p.note}`}</p>
                </div>
                <p className="font-semibold text-emerald-700">+ {rupees(p.amount)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-sm text-slate-500">No payments recorded yet.</p>
        )}
      </Card>

      {paying && (
        <PaymentDialog
          supplier={paying}
          onClose={() => setPaying(null)}
          onSaved={() => {
            setPaying(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function FeeSetting({ percent, onSaved }: { percent: number; onSaved: () => void }) {
  const [value, setValue] = useState(String(percent));
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const number = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(number) && number >= 0 && number <= 30 && (number * 2) % 1 === 0;

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/api/admin/settings", { method: "PUT", body: JSON.stringify({ platformFeePercent: number }) });
      toast("success", number === 0 ? "Platform fee turned off" : `Platform fee set to ${number}%`);
      onSaved();
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="font-semibold text-slate-900">Platform fee</h2>
          <p className="mt-1 text-sm text-slate-500">
            The share of each job&apos;s price that Tolely keeps. It applies to bookings made <strong>after</strong> you save; jobs
            already booked keep the fee they were booked with. Customers never see it. Suppliers see what they will earn.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Fee (%)</span>
            <input
              className={`${inputClass} w-28`}
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <Button loading={saving} disabled={!valid || number === percent} onClick={save}>Save</Button>
        </div>
      </div>
      {!valid && <p className="mt-3 text-sm text-red-600">Enter a number from 0 to 30, in steps of 0.5.</p>}
    </Card>
  );
}

function PaymentDialog({ supplier, onClose, onSaved }: { supplier: Supplier; onClose: () => void; onSaved: () => void }) {
  const owed = supplier.feeBalance ?? 0;
  const [amount, setAmount] = useState(String(owed));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const number = Number(amount);
  const valid = Number.isInteger(number) && number >= 1 && number <= owed;

  async function save() {
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/api/admin/suppliers/${supplier.uid}/settlements`, {
        method: "POST",
        body: JSON.stringify({ amount: number, note }),
      });
      toast("success", `Recorded ${rupees(number)} from ${supplier.name}`);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Payment from ${supplier.name}`} onClose={onClose}>
      <p className="text-sm text-slate-600">
        {supplier.name} owes <strong>{rupees(owed)}</strong>. Record what they paid you (cash, bank transfer, eSewa...).
      </p>
      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Amount received (Rs)</span>
          <input className={inputClass} type="number" min={1} max={owed} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Note (optional)</span>
          <input className={inputClass} value={note} maxLength={200} placeholder="e.g. Bank transfer, 9 Oct" onChange={(e) => setNote(e.target.value)} />
        </label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Back</Button>
        <Button loading={saving} disabled={!valid} onClick={save}>Record payment</Button>
      </div>
    </Modal>
  );
}

function exportBookings(bookings: Booking[]) {
  // The BOM makes Excel read Nepali names correctly.
  const blob = new Blob(["\ufeff", bookingsToCsv(bookings)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tolely-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
