import type { Metadata } from "next";
import { AppButtons, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Become a partner · Tolely",
  description: "Tanker owners, plumbers and electricians: get steady jobs near you with Tolely.",
};

const BENEFITS = [
  { en: "More customers", ne: "धेरै ग्राहक", text: "Get job requests from homes near you, without waiting for phone calls." },
  { en: "Clear prices", ne: "स्पष्ट मूल्य", text: "Every job shows the price upfront, so there's no bargaining at the door." },
  { en: "Your choice", ne: "तपाईंको छनौट", text: "Accept only the jobs that suit your time and area." },
  { en: "Build your name", ne: "आफ्नो नाम बनाउनुहोस्", text: "Good ratings bring you more work and repeat customers." },
];

const STEPS = [
  "Download the Tolely app and log in with your mobile number.",
  "Choose “I provide a service” and fill in your name, area and services.",
  "Tanker owners: add your vehicle number and where you fill water.",
  "Our team calls you to check your details and documents.",
  "Once verified, you start getting jobs.",
];

const DOCUMENTS = [
  "Citizenship card",
  "For tankers: vehicle registration (bluebook) and water source details",
  "For plumbers and electricians: any training certificate or work references (if you have them)",
];

export default function PartnersPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-sky-50 text-slate-900">
        <section className="mx-auto max-w-6xl px-4 py-16">
          <p className="font-semibold text-amber-600">Tolely partner · टोलेली साझेदार</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-bold leading-tight text-sky-900">
            Get steady work in your area. Joining is free.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            For water tanker owners, plumbers, electricians and other skilled workers in {SITE.city}.
          </p>
          <div className="mt-8">
            <AppButtons />
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.en} className="rounded-2xl bg-sky-50 p-6">
                <h2 className="text-lg font-semibold">{b.en}</h2>
                <p className="text-sm font-medium text-amber-600">{b.ne}</p>
                <p className="mt-2 text-slate-600">{b.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-sky-900">How to join</h2>
            <ol className="mt-4 space-y-3">
              {STEPS.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-700 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-slate-700">{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-sky-900">Keep these ready</h2>
            <ul className="mt-4 space-y-2">
              {DOCUMENTS.map((d) => (
                <li key={d} className="flex gap-2 text-slate-700">
                  <span className="text-sky-700">✓</span>
                  {d}
                </li>
              ))}
            </ul>
            {SITE.contactPhone && (
              <p className="mt-6 text-slate-600">
                Questions? Call us at{" "}
                <a href={`tel:${SITE.contactPhone}`} className="font-medium text-sky-800 underline">
                  {SITE.contactPhone}
                </a>
                .
              </p>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
