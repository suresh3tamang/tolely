"use client";

import { Mic, MicOff, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/client/firebase";
import { useI18n } from "@/client/i18n/provider";
import { makeRecognition, speechLang, type Recognition } from "@/client/speech";
import { meansCurrentLocation } from "@/shared/here-words";
import { Button } from "@/components/ui";

export type FoundPlace = { id: string; label: string; detail: string; lat: number; lng: number };

/**
 * Search box for the map: type "Balkot Chowk", press Search, and the first match is picked
 * (the map moves there). Other matches are listed in case the first is not the right one.
 */
export function PlaceSearch({ onPick, onHere }: { onPick: (place: FoundPlace) => void; onHere?: () => void }) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"idle" | "searching" | "none" | "failed">("idle");
  const [others, setOthers] = useState<FoundPlace[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(0); // only the newest search may show its answer
  const recognition = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  const [canListen, setCanListen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- speech support is only known in the browser
    setCanListen(!!makeRecognition());
    return () => recognition.current?.stop();
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const fetchPlaces = (q: string) => apiFetch<{ results: FoundPlace[] }>(`/api/places/search?q=${encodeURIComponent(q)}&lang=${lang}`);

  // The Search button / Enter: go to the best match straight away.
  async function search(said?: string) {
    const q = (said ?? query).trim();
    if (q.length < 2) return;
    // "mero ghar", "yahi", "aile basirako gharma": use where they are now.
    if (onHere && meansCurrentLocation(q)) {
      if (timer.current) clearTimeout(timer.current);
      latest.current++;
      setOthers([]);
      setState("idle");
      setQuery("");
      return onHere();
    }
    if (timer.current) clearTimeout(timer.current);
    const mine = ++latest.current;
    setState("searching");
    setOthers([]);
    try {
      const res = await fetchPlaces(q);
      if (mine !== latest.current) return;
      if (!res.results.length) return setState("none");
      onPick(res.results[0]);
      setOthers(res.results.slice(1, 5));
      setState("idle");
    } catch {
      if (mine === latest.current) setState("failed");
    }
  }

  // While typing: from 3 letters, after a short pause, list suggestions (the map does not move until one is chosen).
  function typed(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    const q = value.trim();
    const mine = ++latest.current;
    if (q.length < 3 || meansCurrentLocation(q)) {
      setOthers([]);
      setState("idle");
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetchPlaces(q);
        if (mine !== latest.current) return;
        setOthers(res.results.slice(0, 5));
        setState("idle");
      } catch {
        // suggestions are a bonus: the Search button still reports problems
      }
    }, 600);
  }

  /** Say the place ("Balkot chowk"): the words fill the box and the map moves there. */
  function listen() {
    if (listening) return recognition.current?.stop();
    const r = makeRecognition();
    if (!r) return;
    recognition.current = r;
    r.lang = speechLang(lang);
    r.interimResults = true;
    r.continuous = false;
    let finalText = "";
    r.onresult = (e) => {
      let words = "";
      for (let i = 0; i < e.results.length; i++) {
        words += e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText = e.results[i][0].transcript;
      }
      if (timer.current) clearTimeout(timer.current);
      setQuery(words);
    };
    r.onerror = () => setListening(false);
    r.onend = () => {
      setListening(false);
      if (finalText.trim().length >= 2) {
        setQuery(finalText);
        void search(finalText);
      }
    };
    setListening(true);
    setOthers([]);
    r.start();
  }

  function choose(place: FoundPlace) {
    latest.current++;
    onPick(place);
    setOthers([]);
  }

  return (
    <div className="mb-3">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          placeholder={listening ? t("voiceListening") : t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          maxLength={100}
          onChange={(e) => typed(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // the map sits inside the booking form: Enter must search, not submit
              void search();
            }
          }}
          className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
        />
        {canListen && (
          <button
            type="button"
            onClick={listen}
            aria-label={listening ? t("voiceStop") : t("searchByVoice")}
            title={t("searchByVoice")}
            className={`relative flex size-11 shrink-0 items-center justify-center rounded-lg border transition ${
              listening ? "border-red-500 bg-red-500 text-white" : "border-slate-200 bg-white text-sky-700 shadow-sm hover:bg-sky-50"
            }`}
          >
            {listening && <span className="absolute inset-0 animate-ping rounded-lg bg-red-400/50" />}
            {listening ? <MicOff className="relative size-5" /> : <Mic className="size-5" />}
          </button>
        )}
        <Button type="button" className="h-11 px-5" icon={Search} loading={state === "searching"} disabled={query.trim().length < 2} onClick={() => void search()}>
          {t("searchButton")}
        </Button>
      </div>
      {state === "none" && <p className="mt-2 text-sm text-amber-700">{t("noPlaces")}</p>}
      {state === "failed" && <p className="mt-2 text-sm text-amber-700">{t("searchFailed")}</p>}
      {others.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-slate-500">{t("searchResults")}</p>
          <ul className="mt-1 divide-y divide-slate-100 rounded-xl bg-white ring-1 ring-slate-200">
            {others.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => choose(p)} className="w-full px-4 py-2 text-left hover:bg-slate-50">
                  <span className="block font-medium text-slate-900">{p.label}</span>
                  {p.detail && <span className="block text-sm text-slate-500">{p.detail}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
