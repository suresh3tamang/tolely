"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/client/i18n/provider";

/** Switches the customer pages between Nepali and English. */
export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "ne" ? "en" : "ne")}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
      aria-label={t("language")}
    >
      <Languages className="size-4 text-slate-400" />
      {t("switchTo")}
    </button>
  );
}
