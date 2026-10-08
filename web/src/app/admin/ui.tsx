"use client";

import { CircleCheck, CircleX, LoaderCircle, X, type LucideIcon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// Small design system for the admin dashboard.

export const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:bg-slate-50 disabled:text-slate-500";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success";
  size?: "sm" | "md";
  icon?: LucideIcon;
  loading?: boolean;
};

const VARIANTS = {
  primary: "bg-sky-700 text-white shadow-sm hover:bg-sky-800",
  secondary: "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50",
  danger: "border border-red-200 bg-white text-red-700 shadow-sm hover:bg-red-50",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
};

export function Button({ variant = "primary", size = "md", icon: Icon, loading, className = "", children, disabled, ...rest }: ButtonProps) {
  const sizing = size === "sm" ? "h-8 gap-1.5 px-3 text-xs" : "h-10 gap-2 px-4 text-sm";
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${VARIANTS[variant]} ${className}`}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : Icon && <Icon className="size-4" />}
      {children}
    </button>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

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

export function Badge({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
      {children}
    </span>
  );
}

const AVATAR_COLORS = ["bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700", "bg-violet-100 text-violet-700", "bg-rose-100 text-rose-700"];

export function Avatar({ name }: { name?: string | null }) {
  const label = (name ?? "?").trim();
  const initials = label.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  const color = AVATAR_COLORS[[...label].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${color}`}>{initials}</span>;
}

export function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="size-6" />
      </span>
      <p className="mt-3 font-medium text-slate-900">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
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

// Toasts: short messages in the corner after an action.
type Toast = { id: number; kind: "success" | "error"; text: string };
const ToastContext = createContext<(kind: Toast["kind"], text: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-lg">
            {t.kind === "success" ? <CircleCheck className="size-5 shrink-0 text-emerald-600" /> : <CircleX className="size-5 shrink-0 text-red-600" />}
            <p className="text-slate-700">{t.text}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function formatDate(iso: string | undefined, withTime = true) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "numeric", minute: "2-digit", hour12: true } : {}),
  });
}

export const rupees = (n: number) => `Rs ${n.toLocaleString("en-IN")}`;

/** "1 job", "3 jobs" */
export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
