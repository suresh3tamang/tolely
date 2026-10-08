"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/firebase-client";
import { SERVICE_ICONS, type Service, type ServiceOption } from "@/lib/services";

const input = "w-full rounded border px-2 py-1.5 text-sm";

/** Edit prices, names and on/off state of services, or add a new one. */
export function ServicesEditor({ services, onSaved }: { services: Service[]; onSaved: () => void }) {
  const [editing, setEditing] = useState<Service | null>(null);
  const [isNew, setIsNew] = useState(false);

  function startNew() {
    setIsNew(true);
    setEditing({
      key: "",
      nameEn: "",
      nameNe: "",
      icon: "handyman",
      active: false,
      options: [{ id: "visit", labelEn: "Visit + inspection", labelNe: "भ्रमण + जाँच", price: 500 }],
    });
  }

  if (editing) {
    return (
      <ServiceForm
        initial={editing}
        isNew={isNew}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          onSaved();
        }}
      />
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Prices here are what customers pay. Changes show in the app within a few minutes.
        </p>
        <button onClick={startNew} className="rounded bg-sky-700 px-3 py-1.5 text-sm text-white hover:bg-sky-800">
          + New service
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {services.map((s) => (
          <div key={s.key} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {s.nameEn} <span className="font-normal text-slate-500">· {s.nameNe}</span>
                </p>
                <p className="text-xs text-slate-400">{s.key} · {s.icon}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${s.active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"}`}>
                {s.active ? "live" : "off"}
              </span>
            </div>
            <ul className="mt-2 text-sm text-slate-600">
              {s.options.map((o) => (
                <li key={o.id} className="flex justify-between">
                  <span>{o.labelEn}</span>
                  <span>Rs {o.price.toLocaleString("en-IN")}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                setIsNew(false);
                setEditing(s);
              }}
              className="mt-3 rounded border px-3 py-1 text-sm hover:bg-slate-50"
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServiceForm({
  initial,
  isNew,
  onCancel,
  onSaved,
}: {
  initial: Service;
  isNew: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [s, setS] = useState<Service>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const setOption = (i: number, patch: Partial<ServiceOption>) =>
    setS({ ...s, options: s.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) });

  async function save() {
    setSaving(true);
    setError("");
    try {
      const { key, ...body } = s;
      await apiFetch(`/api/admin/services/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify(body) });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">{isNew ? "New service" : `Edit ${initial.nameEn}`}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Key (permanent, e.g. ac_repair)
          <input className={input} value={s.key} disabled={!isNew}
            onChange={(e) => setS({ ...s, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} />
        </label>
        <label className="text-sm">
          Icon
          <select className={input} value={s.icon} onChange={(e) => setS({ ...s, icon: e.target.value })}>
            {SERVICE_ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Name (English)
          <input className={input} value={s.nameEn} onChange={(e) => setS({ ...s, nameEn: e.target.value })} />
        </label>
        <label className="text-sm">
          Name (Nepali)
          <input className={input} value={s.nameNe} onChange={(e) => setS({ ...s, nameNe: e.target.value })} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={s.active} onChange={(e) => setS({ ...s, active: e.target.checked })} />
        Live: customers can book this service
      </label>

      <div>
        <p className="mb-2 text-sm font-medium">Options and prices</p>
        <div className="space-y-2">
          {s.options.map((o, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_2fr_1fr_auto] gap-2">
              <input className={input} placeholder="id" value={o.id}
                onChange={(e) => setOption(i, { id: e.target.value.replace(/[^a-zA-Z0-9_-]/g, "") })} />
              <input className={input} placeholder="Label (English)" value={o.labelEn}
                onChange={(e) => setOption(i, { labelEn: e.target.value })} />
              <input className={input} placeholder="Label (Nepali)" value={o.labelNe}
                onChange={(e) => setOption(i, { labelNe: e.target.value })} />
              <input className={input} type="number" min={0} placeholder="Rs" value={o.price}
                onChange={(e) => setOption(i, { price: Math.max(0, Math.round(Number(e.target.value))) })} />
              <button onClick={() => setS({ ...s, options: s.options.filter((_, j) => j !== i) })}
                disabled={s.options.length === 1}
                className="rounded border px-2 text-red-700 hover:bg-red-50 disabled:opacity-30" aria-label="Remove option">
                ✕
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setS({ ...s, options: [...s.options, { id: "", labelEn: "", labelNe: "", price: 0 }] })}
          className="mt-2 text-sm text-sky-700 hover:underline">
          + Add option
        </button>
        <p className="mt-1 text-xs text-slate-400">Don&apos;t change an option id after people have booked it; add a new option instead.</p>
      </div>

      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving || !s.key}
          className="rounded bg-sky-700 px-4 py-2 text-white hover:bg-sky-800 disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="rounded border px-4 py-2 hover:bg-slate-50">Cancel</button>
      </div>
    </div>
  );
}
