import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-sky-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/icon.svg" alt="" width={36} height={36} />
          <span className="text-xl font-bold text-sky-800">{SITE.name}</span>
          <span className="hidden text-sm font-semibold text-amber-500 sm:inline">{SITE.nameNe}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-4">
          <Link href="/#services" className="hidden px-2 py-1 text-slate-600 hover:text-sky-800 md:inline">Services</Link>
          <Link href="/#how" className="hidden px-2 py-1 text-slate-600 hover:text-sky-800 md:inline">How it works</Link>
          <Link href="/#faq" className="hidden px-2 py-1 text-slate-600 hover:text-sky-800 md:inline">FAQ</Link>
          <Link href="/partners" className="rounded-full bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-600">
            Become a partner
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-sky-100 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-slate-600 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <Image src="/icon.svg" alt="" width={28} height={28} />
            <span className="font-bold text-sky-800">{SITE.name}</span>
            <span className="font-semibold text-amber-500">{SITE.nameNe}</span>
          </div>
          <p className="mt-2">{SITE.tagline}.</p>
          <p>{SITE.taglineNe}।</p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-slate-900">Tolely</p>
          <Link href="/#services" className="block hover:text-sky-800">Services</Link>
          <Link href="/partners" className="block hover:text-sky-800">Become a partner</Link>
          <Link href="/privacy" className="block hover:text-sky-800">Privacy policy</Link>
          <Link href="/terms" className="block hover:text-sky-800">Terms of service</Link>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-slate-900">Contact</p>
          <p>{SITE.city}, Nepal</p>
          {SITE.contactPhone && <a href={`tel:${SITE.contactPhone}`} className="block hover:text-sky-800">{SITE.contactPhone}</a>}
          {SITE.contactEmail && <a href={`mailto:${SITE.contactEmail}`} className="block hover:text-sky-800">{SITE.contactEmail}</a>}
          {SITE.facebookUrl && <a href={SITE.facebookUrl} className="block hover:text-sky-800">Facebook</a>}
        </div>
      </div>
      <p className="pb-6 text-center text-xs text-slate-400">© {SITE.name} · Made in Nepal</p>
    </footer>
  );
}

/** App store buttons, or "coming soon" until the store links are set. */
export function AppButtons() {
  if (!SITE.playStoreUrl && !SITE.appStoreUrl) {
    return (
      <span className="inline-block rounded-full bg-white/80 px-5 py-3 font-medium text-sky-800 ring-1 ring-sky-200">
        App coming soon on Android &amp; iPhone
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-3">
      {SITE.playStoreUrl && (
        <a href={SITE.playStoreUrl} className="rounded-full bg-sky-700 px-5 py-3 font-medium text-white hover:bg-sky-800">
          Get it on Google Play
        </a>
      )}
      {SITE.appStoreUrl && (
        <a href={SITE.appStoreUrl} className="rounded-full bg-slate-900 px-5 py-3 font-medium text-white hover:bg-black">
          Download on the App Store
        </a>
      )}
    </div>
  );
}

/** Shared layout for long text pages (privacy, terms). */
export function TextPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="bg-sky-50 text-slate-800">
        <article className="mx-auto max-w-3xl px-4 py-12 [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc [&_p]:my-3 [&_ul]:my-3">
          <h1 className="text-3xl font-bold text-sky-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">Last updated: {updated}</p>
          {children}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
