import type { Metadata } from "next";
import { LanguageProvider } from "@/client/i18n/provider";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { BookApp } from "./book-app";

export const metadata: Metadata = {
  title: "Book a service · Tolely",
  description: "Book water tankers, plumbers and electricians in Kathmandu. Sign in with Google.",
};

export default function BookPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[70vh] bg-sky-50 text-slate-900">
        <LanguageProvider>
          <BookApp />
        </LanguageProvider>
      </main>
      <SiteFooter />
    </>
  );
}
