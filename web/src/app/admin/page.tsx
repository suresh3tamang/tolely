"use client";

import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, clientAuth } from "@/lib/firebase-client";
import { ServicesEditor } from "./services-editor";
import { BookingsTable, ComplaintsList, SuppliersTable } from "./tables";
import type { Overview } from "./types";

export default function AdminPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => onAuthStateChanged(clientAuth(), setUser), []);

  if (user === undefined) return <Shell>Loading…</Shell>;
  if (!user) return <Login />;
  return <Dashboard user={user} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </main>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(clientAuth(), email, password);
    } catch {
      setError("Wrong email or password");
    }
  }

  return (
    <Shell>
      <form onSubmit={submit} className="mx-auto mt-16 max-w-sm space-y-4 rounded-xl bg-white p-6 shadow">
        <div className="flex items-center gap-3">
          <Image src="/icon.svg" alt="" width={40} height={40} />
          <h1 className="text-xl font-semibold">Tolely Admin</h1>
        </div>
        <input className="w-full rounded border px-3 py-2" type="email" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded border px-3 py-2" type="password" placeholder="Password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-sky-700 py-2 font-medium text-white hover:bg-sky-800">Sign in</button>
      </form>
    </Shell>
  );
}

const TABS = ["bookings", "suppliers", "services", "complaints"] as const;

function Dashboard({ user }: { user: User }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("bookings");

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<Overview>("/api/admin/overview"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    load();
  }, [load]);

  async function post(path: string, body?: object) {
    try {
      await apiFetch(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function cancelBooking(id: string) {
    if (confirm("Cancel this booking? The customer and supplier will be notified.")) {
      post(`/api/admin/bookings/${id}/cancel`);
    }
  }

  function resolveComplaint(id: string) {
    const resolution = prompt("What was done to fix this?");
    if (resolution?.trim()) post(`/api/admin/complaints/${id}/resolve`, { resolution });
  }

  const bookings = data?.bookings ?? [];
  const suppliers = data?.suppliers ?? [];
  const complaints = data?.complaints ?? [];
  const completed = bookings.filter((b) => b.status === "completed");
  const openComplaints = complaints.filter((c) => c.status === "open").length;
  const stats = [
    { label: "Waiting for supplier", value: bookings.filter((b) => b.status === "pending").length },
    { label: "Completed jobs", value: completed.length },
    { label: "Completed job value (NPR)", value: completed.reduce((sum, b) => sum + b.price, 0).toLocaleString("en-IN") },
    { label: "Suppliers to verify", value: suppliers.filter((s) => !s.verified).length },
    { label: "Open problem reports", value: openComplaints },
  ];

  return (
    <Shell>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image src="/icon.svg" alt="" width={36} height={36} />
          <h1 className="text-2xl font-semibold">Tolely Admin</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">{user.email}</span>
          <button onClick={load} className="rounded border px-3 py-1 hover:bg-white">Refresh</button>
          <button onClick={() => signOut(clientAuth())} className="rounded border px-3 py-1 hover:bg-white">
            Sign out
          </button>
        </div>
      </header>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </section>

      <nav className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm capitalize ${tab === t ? "bg-sky-700 text-white" : "bg-white"}`}>
            {t}
            {t === "complaints" && openComplaints > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 text-xs text-white">{openComplaints}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        {!data ? (
          <p className="p-6 text-slate-500">Loading…</p>
        ) : tab === "bookings" ? (
          <BookingsTable bookings={bookings} onCancel={cancelBooking} />
        ) : tab === "suppliers" ? (
          <SuppliersTable suppliers={suppliers} onVerify={(uid, verified) => post(`/api/admin/suppliers/${uid}/verify`, { verified })} />
        ) : tab === "services" ? (
          <ServicesEditor services={data.services} onSaved={load} />
        ) : (
          <ComplaintsList complaints={complaints} onResolve={resolveComplaint} />
        )}
      </div>
    </Shell>
  );
}
