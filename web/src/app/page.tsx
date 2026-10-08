import Image from "next/image";
import Link from "next/link";
import { SERVICES } from "@/lib/services";

export default function Home() {
  return (
    <main className="min-h-screen bg-sky-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="flex items-center gap-4">
          <Image src="/icon.svg" alt="" width={72} height={72} />
          <div>
            <h1 className="text-4xl font-bold text-sky-800">Tolely</h1>
            <p className="text-xl font-semibold text-amber-500">टोलेली</p>
          </div>
        </div>
        <p className="mt-6 text-lg text-slate-600">
          Trusted local services from your tole. Book water tankers, tank cleaning, plumbers and
          electricians in Kathmandu, with clear prices, verified workers and live status.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {SERVICES.filter((s) => s.active).map((s) => (
            <div key={s.key} className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">
                {s.nameEn} <span className="text-slate-500">· {s.nameNe}</span>
              </h2>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {s.options.map((o) => (
                  <li key={o.id} className="flex justify-between">
                    <span>{o.labelEn}</span>
                    <span className="font-medium">Rs {o.price.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 text-slate-600">Download the app for Android and iOS (coming soon).</p>
        <Link href="/admin" className="mt-2 inline-block text-sm text-sky-700 underline">Admin login</Link>
      </div>
    </main>
  );
}
