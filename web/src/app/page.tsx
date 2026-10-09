import Image from "next/image";
import Link from "next/link";
import { AppButtons, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getCatalog } from "@/server/catalog/catalog.service";
import { SITE } from "@/config/site";

const STEPS = [
  { en: "Choose a service", ne: "सेवा छान्नुहोस्", text: "Tanker, plumber, electrician and more. See the price before you book." },
  { en: "Pick a time", ne: "समय छान्नुहोस्", text: "Book for now or later. A verified supplier near you accepts the job." },
  { en: "Track and pay", ne: "ट्र्याक गरेर तिर्नुहोस्", text: "See live status, call your supplier, pay cash or by QR, then rate the work." },
];

const REASONS = [
  { title: "Verified suppliers", text: "Every supplier is checked by our team before they can take jobs." },
  { title: "Clear prices", text: "Prices are shown before you book. No bargaining, no surprises." },
  { title: "Live status", text: "Know when your job is accepted and when the supplier is on the way." },
  { title: "Ratings that matter", text: "You rate every job. Good suppliers get more work, so quality keeps rising." },
  { title: "Help when things go wrong", text: "Report a problem from the app and our team follows up." },
  { title: "Nepali and English", text: "Use the app in the language you are comfortable with." },
];

const FAQ = [
  {
    q: "Do I need the app to book?",
    a: "No. Customers can book on this website by signing in with Google, or use the Tolely app with their phone number. Service providers use the app.",
  },
  {
    q: "Which areas do you serve?",
    a: `We are starting in ${SITE.city} valley and adding areas as more suppliers join.`,
  },
  {
    q: "How do I pay?",
    a: "Pay the supplier in cash or with an eSewa / Khalti / Fonepay QR when the job is done. Online payment in the app is coming soon.",
  },
  {
    q: "Is the water from tankers safe?",
    a: "Tanker suppliers must tell us their water source before they are verified, and you can see ratings from other customers. Always treat drinking water before use.",
  },
  {
    q: "What if the supplier doesn't come?",
    a: "You can cancel before the supplier is on the way. If a supplier releases your job, we find another one for you, and you can report any problem from the app.",
  },
  {
    q: "I am a plumber / tanker owner. How do I join?",
    a: "Download the app, choose \"I provide a service\" and fill in your details. Our team will call you to verify your account.",
  },
];

export default async function Home() {
  const services = (await getCatalog()).filter((s) => s.active);

  return (
    <>
      <SiteHeader />
      <main className="bg-sky-50 text-slate-900">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.3fr_1fr] md:py-24">
          <div>
            <p className="font-semibold text-amber-600">{SITE.taglineNe}</p>
            <h1 className="mt-2 text-4xl font-bold leading-tight text-sky-900 md:text-5xl">
              Trusted help for your home, from your own tole.
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Book water tankers, plumbers, electricians and more in {SITE.city}. Verified suppliers, clear prices
              and live status, all in one app.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/book" className="rounded-full bg-sky-700 px-7 py-3 text-lg font-semibold text-white shadow-sm hover:bg-sky-800">
                Book now · बुक गर्नुहोस्
              </Link>
              <AppButtons />
              <Link href="#services" className="px-3 py-3 font-medium text-sky-800 hover:underline">
                See prices →
              </Link>
            </div>
            <p className="mt-3 text-sm text-slate-500">Sign in with Google. No app needed to book.</p>
          </div>
          <div className="mx-auto">
            <Image src="/icon.svg" alt="Tolely" width={280} height={280} priority className="w-36 drop-shadow-xl md:w-[280px]" />
          </div>
        </section>

        {/* Services */}
        <section id="services" className="scroll-mt-20 bg-white py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-bold text-sky-900">Services and prices</h2>
            <p className="mt-2 text-slate-600">Starting prices. The final price is shown in the app before you book.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <div key={s.key} className="rounded-2xl border border-sky-100 bg-sky-50/50 p-5">
                  <h3 className="text-lg font-semibold">
                    {s.nameEn} <span className="font-normal text-slate-500">· {s.nameNe}</span>
                  </h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                    {s.options.map((o) => (
                      <li key={o.id} className="flex justify-between gap-4">
                        <span>{o.labelEn}</span>
                        <span className="font-medium text-slate-900">Rs {o.price.toLocaleString("en-IN")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-slate-500">More services are coming: house shifting, home cleaning, painting and repairs.</p>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-bold text-sky-900">How it works</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.en} className="rounded-2xl bg-white p-6 shadow-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-700 font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{step.en}</h3>
                  <p className="text-sm font-medium text-amber-600">{step.ne}</p>
                  <p className="mt-2 text-slate-600">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Why Tolely */}
        <section className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-bold text-sky-900">Why Tolely</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {REASONS.map((r) => (
                <div key={r.title}>
                  <h3 className="font-semibold text-slate-900">{r.title}</h3>
                  <p className="mt-1 text-slate-600">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Partner CTA */}
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-sky-800 p-8 text-white md:flex-row md:items-center md:p-12">
              <div>
                <h2 className="text-2xl font-bold md:text-3xl">Are you a tanker owner, plumber or electrician?</h2>
                <p className="mt-2 text-sky-100">Get steady jobs near you. Joining is free.</p>
              </div>
              <Link href="/partners" className="rounded-full bg-amber-500 px-6 py-3 font-semibold text-white hover:bg-amber-600">
                Become a partner
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 bg-white py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-3xl font-bold text-sky-900">Questions</h2>
            <div className="mt-6 divide-y divide-sky-100">
              {FAQ.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="cursor-pointer list-none font-semibold text-slate-900">
                    <span className="mr-2 inline-block text-sky-700 transition group-open:rotate-90">›</span>
                    {f.q}
                  </summary>
                  <p className="mt-2 pl-5 text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
