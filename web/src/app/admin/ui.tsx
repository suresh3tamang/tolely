"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button, Modal, inputClass } from "@/components/ui";

// Generic building blocks live in components/ui.tsx; re-exported so admin files import from one place.
export * from "@/components/ui";

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Finding supplier", className: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  accepted: { label: "Accepted", className: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  on_the_way: { label: "On the way", className: "bg-indigo-50 text-indigo-700 ring-indigo-600/20" },
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-600 ring-slate-500/20" },
};

export const STATUS_LABELS = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v.label]));

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, className: "bg-slate-100 text-slate-600 ring-slate-500/20" };
  return <Badge className={s.className}>{s.label}</Badge>;
}

const AVATAR_COLORS = ["bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700", "bg-violet-100 text-violet-700", "bg-rose-100 text-rose-700"];

export function Avatar({ name }: { name?: string | null }) {
  const label = (name ?? "?").trim();
  const initials = label.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  const color = AVATAR_COLORS[[...label].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${color}`}>{initials}</span>;
}

/** Confirm dialog, or with `input` a dialog that asks for a short text. */
export function ActionDialog({
  title,
  message,
  confirmLabel,
  danger,
  input,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  input?: { placeholder: string };
  onConfirm: (text: string) => Promise<void>;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm(text.trim());
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-slate-600">{message}</p>
      {input && (
        <textarea ref={ref} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={input.placeholder} className={`${inputClass} mt-4`} />
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Back</Button>
        <Button
          variant={danger ? "danger" : "primary"}
          className={danger ? "border-red-600 bg-red-600 text-white hover:bg-red-700" : ""}
          loading={busy}
          disabled={!!input && text.trim().length < 2}
          onClick={confirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

