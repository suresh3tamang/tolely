"use client";

import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, clientAuth } from "@/lib/firebase-client";

type Booking = {
  id: string;
  serviceNameEn: string;
  optionLabelEn: string;
  price: number;
  status: string;
  customerName: string;
  customerPhone: string;
  supplierName: string | null;
  address: string;
  scheduledFor: string;
  createdAt: string;
};

type Supplier = {
  uid: string;
  name: string;
  phone: string;
  area: string;
  services: string[];
  vehicleNo: string;
  waterSource: string;
  verified: boolean;
  ratingSum: number;
  ratingCount: number;
  completedJobs: number;
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-sky-100 text-sky-800",
  on_the_way: "bg-indigo-100 text-indigo-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-zinc-200 text-zinc-700",
};

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

function Dashboard({ user }: { user: User }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"bookings" | "suppliers">("bookings");

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ bookings: Booking[]; suppliers: Supplier[] }>("/api/admin/overview");
      setBookings(data.bookings);
      setSuppliers(data.suppliers);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    load();
  }, [load]);

  async function setVerified(uid: string, verified: boolean) {
    await apiFetch(`/api/admin/suppliers/${uid}/verify`, {
      method: "POST",
      body: JSON.stringify({ verified }),
    });
    load();
  }

  const completed = bookings.filter((b) => b.status === "completed");
  const stats = [
    { label: "Pending jobs", value: bookings.filter((b) => b.status === "pending").length },
    { label: "Completed", value: completed.length },
    { label: "Revenue (NPR)", value: completed.reduce((sum, b) => sum + b.price, 0).toLocaleString() },
    { label: "Awaiting verification", value: suppliers.filter((s) => !s.verified).length },
  ];

  return (
    <Shell>
      <header className="mb-6 flex items-center justify-between">
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

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </section>

      <nav className="mb-4 flex gap-2">
        {(["bookings", "suppliers"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm capitalize ${tab === t ? "bg-sky-700 text-white" : "bg-white"}`}>
            {t}
          </button>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        {tab === "bookings" ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b text-slate-500">
              <tr>
                <th className="p-3">Service</th><th className="p-3">Customer</th><th className="p-3">Address</th>
                <th className="p-3">Scheduled</th><th className="p-3">Supplier</th><th className="p-3">Price</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b last:border-0">
                  <td className="p-3">{b.serviceNameEn}<div className="text-slate-500">{b.optionLabelEn}</div></td>
                  <td className="p-3">{b.customerName}<div className="text-slate-500">{b.customerPhone}</div></td>
                  <td className="p-3">{b.address}</td>
                  <td className="p-3">{new Date(b.scheduledFor).toLocaleString()}</td>
                  <td className="p-3">{b.supplierName ?? "—"}</td>
                  <td className="p-3">Rs {b.price.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[b.status]}`}>
                      {b.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
              {!bookings.length && <tr><td className="p-6 text-slate-500" colSpan={7}>No bookings yet.</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b text-slate-500">
              <tr>
                <th className="p-3">Name</th><th className="p-3">Services</th><th className="p-3">Area</th>
                <th className="p-3">Vehicle / source</th><th className="p-3">Rating</th><th className="p-3">Jobs</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.uid} className="border-b last:border-0">
                  <td className="p-3">{s.name}<div className="text-slate-500">{s.phone}</div></td>
                  <td className="p-3">{s.services.join(", ")}</td>
                  <td className="p-3">{s.area}</td>
                  <td className="p-3">{s.vehicleNo || "—"}<div className="text-slate-500">{s.waterSource}</div></td>
                  <td className="p-3">
                    {s.ratingCount ? `${(s.ratingSum / s.ratingCount).toFixed(1)} ★ (${s.ratingCount})` : "—"}
                  </td>
                  <td className="p-3">{s.completedJobs}</td>
                  <td className="p-3 text-right">
                    {s.verified ? (
                      <button onClick={() => setVerified(s.uid, false)}
                        className="rounded border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50">Suspend</button>
                    ) : (
                      <button onClick={() => setVerified(s.uid, true)}
                        className="rounded bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700">Verify</button>
                    )}
                  </td>
                </tr>
              ))}
              {!suppliers.length && <tr><td className="p-6 text-slate-500" colSpan={7}>No suppliers yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </Shell>
  );
}
