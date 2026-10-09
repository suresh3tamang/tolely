"use client";

import { Pencil, Plus, Tags, Trash } from "lucide-react";
import { useState } from "react";
import { apiFetch } from "@/client/firebase";
import { ServiceGlyph } from "@/components/service-icons";
import { SERVICE_ICONS, type Service, type ServiceOption } from "@/shared/services";
import { Badge, Button, Card, EmptyState, inputClass, rupees, useToast } from "./ui";

function ServiceIcon({ name, active = true }: { name: string; active?: boolean }) {
  return (
    <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${active ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-400"}`}>
      <ServiceGlyph name={name} className="size-5" />
    </span>
  );
}

/** Edit prices, names and on/off state of services, or add a new one. */
export function ServicesEditor({ services, onSaved }: { services: Service[]; onSaved: () => void }) {
  const [editing, setEditing] = useState<{ service: Service; isNew: boolean } | null>(null);

  if (editing) {
    return (
      <ServiceForm
        initial={editing.service}
        isNew={editing.isNew}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          onSaved();
        }}
      />
    );
  }

  const newService: Service = {
    key: "",
    nameEn: "",
    nameNe: "",
    icon: "handyman",
    active: false,
    options: [{ id: "visit", labelEn: "Visit + inspection", labelNe: "भ्रमण + जाँच", price: 500 }],
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3">
        <p className="text-sm text-sky-900">Prices here are what customers pay. Changes appear in the app within a few minutes.</p>
        <Button icon={Plus} onClick={() => setEditing({ service: newService, isNew: true })}>New service</Button>
      </div>
      {services.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((s) => (
            <Card key={s.key} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <ServiceIcon name={s.icon} active={s.active} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{s.nameEn}</p>
                  <p className="text-sm text-slate-500">{s.nameNe}</p>
                </div>
                {s.active ? (
                  <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Live</Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-500 ring-slate-500/20">Off</Badge>
                )}
              </div>
              <ul className="mt-4 flex-1 divide-y divide-slate-100 text-sm">
                {s.options.map((o) => (
                  <li key={o.id} className="flex justify-between gap-3 py-2">
                    <span className="text-slate-600">{o.labelEn}</span>
                    <span className="font-medium text-slate-900">{rupees(o.price)}</span>
                  </li>
                ))}
              </ul>
              <Button variant="secondary" size="sm" icon={Pencil} className="mt-4 self-start" onClick={() => setEditing({ service: s, isNew: false })}>
                Edit
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <Card><EmptyState icon={Tags} title="No services yet" /></Card>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function ServiceForm({ initial, isNew, onCancel, onSaved }: { initial: Service; isNew: boolean; onCancel: () => void; onSaved: () => void }) {
  const [s, setS] = useState<Service>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const setOption = (i: number, patch: Partial<ServiceOption>) =>
    setS({ ...s, options: s.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) });

  async function save() {
    setSaving(true);
    setError("");
    try {
      const { key, ...body } = s;
      await apiFetch(`/api/admin/services/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify(body) });
      toast("success", `${s.nameEn} saved`);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-4xl">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <ServiceIcon name={s.icon} active={s.active} />
        <div>
          <h2 className="font-semibold text-slate-900">{isNew ? "New service" : `Edit ${initial.nameEn}`}</h2>
          <p className="text-sm text-slate-500">Name, icon and prices shown in the app</p>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name (English)">
            <input className={inputClass} value={s.nameEn} onChange={(e) => setS({ ...s, nameEn: e.target.value })} placeholder="e.g. AC Repair" />
          </Field>
          <Field label="Name (Nepali)">
            <input className={inputClass} value={s.nameNe} onChange={(e) => setS({ ...s, nameNe: e.target.value })} placeholder="जस्तै: एसी मर्मत" />
          </Field>
          <Field label="Key" hint={isNew ? "Permanent id: lowercase letters, numbers and _" : "Can't be changed"}>
            <input className={inputClass} value={s.key} disabled={!isNew} placeholder="ac_repair"
              onChange={(e) => setS({ ...s, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} />
          </Field>
          <Field label="Icon">
            <div className="flex flex-wrap gap-2">
              {SERVICE_ICONS.map((name) => {
                return (
                  <button key={name} type="button" title={name} onClick={() => setS({ ...s, icon: name })}
                    className={`flex size-10 items-center justify-center rounded-lg border transition ${s.icon === name ? "border-sky-500 bg-sky-50 text-sky-700 ring-4 ring-sky-500/10" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                    <ServiceGlyph name={name} className="size-5" />
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
          <span>
            <span className="block text-sm font-medium text-slate-900">Live</span>
            <span className="block text-sm text-slate-500">Customers can see and book this service</span>
          </span>
          <input type="checkbox" className="peer sr-only" checked={s.active} onChange={(e) => setS({ ...s, active: e.target.checked })} />
          <span className="relative h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-emerald-500 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
        </label>

        <div>
          <p className="text-sm font-medium text-slate-700">Options and prices</p>
          <p className="mb-3 text-xs text-slate-500">Don&apos;t change an option id after people have booked it; add a new option instead.</p>
          <div className="space-y-2">
            <div className="hidden grid-cols-[1fr_2fr_2fr_1fr_auto] gap-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-500 md:grid">
              <span>Id</span><span>Label (English)</span><span>Label (Nepali)</span><span>Price (Rs)</span><span className="w-10" />
            </div>
            {s.options.map((o, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-slate-100 p-2 md:grid-cols-[1fr_2fr_2fr_1fr_auto] md:border-0 md:p-0">
                <input className={inputClass} placeholder="id" value={o.id}
                  onChange={(e) => setOption(i, { id: e.target.value.replace(/[^a-zA-Z0-9_-]/g, "") })} />
                <input className={inputClass} placeholder="Label (English)" value={o.labelEn} onChange={(e) => setOption(i, { labelEn: e.target.value })} />
                <input className={inputClass} placeholder="Label (Nepali)" value={o.labelNe} onChange={(e) => setOption(i, { labelNe: e.target.value })} />
                <input className={inputClass} type="number" min={0} placeholder="Rs" value={o.price}
                  onChange={(e) => setOption(i, { price: Math.max(0, Math.round(Number(e.target.value))) })} />
                <button type="button" onClick={() => setS({ ...s, options: s.options.filter((_, j) => j !== i) })}
                  disabled={s.options.length === 1} aria-label="Remove option"
                  className="flex size-10 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30">
                  <Trash className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" icon={Plus} className="mt-2"
            onClick={() => setS({ ...s, options: [...s.options, { id: "", labelEn: "", labelNe: "", price: 0 }] })}>
            Add option
          </Button>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button loading={saving} disabled={!s.key} onClick={save}>Save service</Button>
      </div>
    </Card>
  );
}
