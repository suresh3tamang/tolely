"use client";

import { CalendarCheck, LayoutDashboard, LogOut, MessageSquareWarning, RefreshCw, Tags, Truck, Wallet, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { Avatar, Button } from "./ui";

export const SECTIONS = ["overview", "bookings", "suppliers", "money", "services", "complaints"] as const;
export type Section = (typeof SECTIONS)[number];

const NAV: Record<Section, { label: string; icon: LucideIcon; description: string }> = {
  overview: { label: "Overview", icon: LayoutDashboard, description: "How Tolely is doing today" },
  bookings: { label: "Bookings", icon: CalendarCheck, description: "Every job booked by customers" },
  suppliers: { label: "Suppliers", icon: Truck, description: "Verify new suppliers and manage existing ones" },
  money: { label: "Money", icon: Wallet, description: "Platform fee, what suppliers owe, and payments received" },
  services: { label: "Services & prices", icon: Tags, description: "What customers can book, and what it costs" },
  complaints: { label: "Problem reports", icon: MessageSquareWarning, description: "Issues reported by customers and suppliers" },
};

export function AdminShell({
  section,
  onSection,
  counts,
  email,
  onRefresh,
  refreshing,
  onSignOut,
  children,
}: {
  section: Section;
  onSection: (s: Section) => void;
  counts: Partial<Record<Section, number>>;
  email: string | null;
  onRefresh: () => void;
  refreshing: boolean;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  const current = NAV[section];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-5">
          <Image src="/icon.svg" alt="" width={32} height={32} />
          <div className="leading-tight">
            <p className="font-semibold text-slate-900">Tolely</p>
            <p className="text-xs text-slate-500">Admin console</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {SECTIONS.map((s) => {
            const { label, icon: Icon } = NAV[s];
            const active = s === section;
            return (
              <button
                key={s}
                onClick={() => onSection(s)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-sky-50 text-sky-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`size-[18px] ${active ? "text-sky-700" : "text-slate-400"}`} />
                <span className="flex-1 text-left">{label}</span>
                {!!counts[s] && (
                  <span className={`rounded-full px-2 py-0.5 text-xs ${s === "complaints" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                    {counts[s]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar name={email} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{email}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
            <button onClick={onSignOut} title="Sign out" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Top bar (mobile: brand + nav) */}
        <div className="border-b border-slate-200 bg-white lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Image src="/icon.svg" alt="" width={28} height={28} />
              <span className="font-semibold">Tolely Admin</span>
            </div>
            <Button variant="ghost" size="sm" icon={LogOut} onClick={onSignOut}>Sign out</Button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
            {SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onSection(s)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${s === section ? "bg-sky-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {NAV[s].label}
                {!!counts[s] && <span className="ml-1 opacity-75">({counts[s]})</span>}
              </button>
            ))}
          </nav>
        </div>

        <header className="flex flex-wrap items-end justify-between gap-4 px-4 pt-8 pb-6 md:px-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{current.label}</h1>
            <p className="mt-1 text-sm text-slate-500">{current.description}</p>
          </div>
          <Button variant="secondary" icon={RefreshCw} loading={refreshing} onClick={onRefresh}>
            Refresh
          </Button>
        </header>
        <main className="px-4 pb-12 md:px-8">{children}</main>
      </div>
    </div>
  );
}
