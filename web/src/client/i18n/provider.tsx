"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { en, ne, type Strings } from "./strings";

export type Lang = "ne" | "en";
const DICTIONARIES: Record<Lang, Strings> = { en, ne };
const STORAGE_KEY = "tolely-language";

type Vars = Record<string, string | number>;

type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Translate a key, filling {placeholders}. */
  t: (key: keyof Strings, vars?: Vars) => string;
  /** Pick `<base>Ne` or `<base>En` from server data, e.g. pick(service, "name"). */
  pick: (item: Record<string, unknown>, base: string) => string;
};

const Context = createContext<I18n | null>(null);

/** Fills "Namaste, {name}" style placeholders. */
export function format(template: string, vars?: Vars): string {
  return vars ? template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? "")) : template;
}

/** The language of the customer pages. Nepali by default; remembered in the browser. */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ne");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read the saved choice once after load
      if (saved === "en" || saved === "ne") setLangState(saved);
    } catch {
      // Private browsing: just use the default.
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not saved; still works for this visit.
    }
  }, []);

  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => format(DICTIONARIES[lang][key], vars),
      pick: (item, base) => {
        const first = item[`${base}${lang === "ne" ? "Ne" : "En"}`];
        const fallback = item[`${base}En`];
        return typeof first === "string" && first ? first : typeof fallback === "string" ? fallback : "";
      },
    }),
    [lang, setLang],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(Context);
  if (!value) throw new Error("useI18n must be used inside <LanguageProvider>");
  return value;
}
