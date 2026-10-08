"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { ShieldCheck, Star, Truck } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { clientAuth } from "@/lib/firebase-client";
import { Button, inputClass } from "./ui";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(clientAuth(), email, password);
    } catch {
      setError("Wrong email or password.");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-sky-600 to-sky-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <Image src="/icon.svg" alt="" width={40} height={40} className="rounded-xl ring-1 ring-white/20" />
          <span className="text-lg font-semibold">Tolely</span>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">Run Tolely from one place.</h1>
          <p className="mt-4 max-w-md text-sky-100">Verify suppliers, keep prices fair and follow every booking from request to rating.</p>
          <ul className="mt-8 space-y-3 text-sm text-sky-50">
            <li className="flex items-center gap-3"><ShieldCheck className="size-5 text-amber-300" /> Verify every supplier before they take jobs</li>
            <li className="flex items-center gap-3"><Truck className="size-5 text-amber-300" /> Follow bookings live across the valley</li>
            <li className="flex items-center gap-3"><Star className="size-5 text-amber-300" /> Keep quality high with ratings and reports</li>
          </ul>
        </div>
        <p className="text-sm text-sky-200">टोलेली · तपाईंकै टोलबाट भरपर्दो सेवा</p>
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-white/5" />
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <Image src="/icon.svg" alt="" width={48} height={48} className="lg:hidden" />
          <h2 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0">Sign in to admin</h2>
          <p className="mt-1 text-sm text-slate-500">Use your Tolely admin account.</p>
          <div className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
              <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
              <input className={inputClass} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Button type="submit" loading={busy} className="w-full">Sign in</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
