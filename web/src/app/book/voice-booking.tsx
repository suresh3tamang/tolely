"use client";

import { Loader2, Mic, MicOff, RotateCcw, Send, Sparkles, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/client/firebase";
import { useI18n } from "@/client/i18n/provider";
import { makeRecognition, type Recognition } from "@/client/speech";
import { dayKey } from "@/shared/schedule";

/** The draft the server returns (see server/voice/voice.service.ts). */
export type VoiceDraft = {
  understood: boolean;
  serviceKey: string | null;
  optionId: string | null;
  date: string | null;
  slot: "asap" | "06-09" | "09-12" | "12-15" | "15-18" | "18-21" | null;
  contactName: string | null;
  contactPhone: string | null;
  note: string;
  reply: string;
  /** What to ask next (service, day, time), or null when the booking is ready to confirm. */
  ask: "service" | "date" | "slot" | null;
  /** Answers the customer can tap instead of speaking. */
  choices: { label: string; value: string }[];
};

/** The customer's own date and time, so "today" means their day. */
function clientClock() {
  const now = new Date();
  return {
    today: dayKey(now),
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    weekday: now.toLocaleDateString("en-GB", { weekday: "long" }),
  };
}

type State = "idle" | "listening" | "thinking" | "error";

/** Reads a question aloud if the browser has a voice for the language; calls `then` when finished (or at once). */
function speak(text: string, lang: string, then: () => void) {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  const voice = synth?.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));
  if (!synth || !voice) return then();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.onend = () => then();
  utterance.onerror = () => then();
  synth.cancel();
  synth.speak(utterance);
}

/**
 * "Book by voice", as a short conversation: the customer says what they need ("plumber chaiyo"), Tolely asks
 * what is missing ("which day?", "what time?") and they answer by speaking or tapping. Each answer fills in the
 * form (`onDraft`); nothing is booked until the customer taps Confirm.
 */
export function VoiceBooking({ onDraft }: { onDraft: (draft: VoiceDraft, done: boolean) => void }) {
  const { t, lang } = useI18n();
  const [text, setText] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [canListen, setCanListen] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  // What was understood so far in this conversation.
  const [draft, setDraft] = useState<VoiceDraft | null>(null);
  // After a spoken answer, the next question is read out and the mic opens again by itself.
  const handsFree = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- speech support is only known in the browser
    setCanListen(!!makeRecognition());
    return () => {
      recognition.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  /** One turn: what was said (or the tapped choice) goes to the server with what was understood before. */
  async function send(words: string, choice: { ask: string; value: string } | null = null) {
    const said = words.trim();
    if (!choice && said.length < 2) return;
    setState("thinking");
    setMessage("");
    try {
      const res = await apiFetch<{ draft: VoiceDraft }>("/api/voice/parse", {
        method: "POST",
        body: JSON.stringify({ text: said, previous: draft && strip(draft), choice, lang, ...clientClock() }),
      });
      const next = res.draft;
      setDraft(next);
      setState("idle");
      setMessage(next.reply);
      setText("");
      if (next.serviceKey) onDraft(next, next.ask === null);
      // Ask the next question out loud and listen for the answer, like a phone call.
      if (handsFree.current) speak(next.reply, lang, () => (next.ask ? startListening() : undefined));
    } catch (e) {
      setState("error");
      setMessage((e as Error).message || t("voiceFailed"));
    }
  }

  function startOver() {
    window.speechSynthesis?.cancel();
    recognition.current?.stop();
    handsFree.current = false;
    setDraft(null);
    setText("");
    setMessage("");
    setState("idle");
  }

  function listen() {
    if (state === "listening") return recognition.current?.stop();
    startListening();
  }

  function startListening() {
    const r = makeRecognition();
    if (!r) return;
    recognition.current = r;
    r.lang = lang === "ne" ? "ne-NP" : "en-IN";
    r.interimResults = true;
    r.continuous = false;
    let finalText = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const piece = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText = piece;
        else interim += piece;
      }
      setText(finalText || interim);
    };
    r.onerror = (e) => {
      setState("error");
      setMessage(e.error === "not-allowed" || e.error === "service-not-allowed" ? t("micBlocked") : t("voiceNotHeard"));
    };
    r.onend = () => {
      if (finalText) void send(finalText);
      else setState((s) => (s === "listening" ? "idle" : s));
    };
    handsFree.current = true;
    window.speechSynthesis?.cancel();
    setText("");
    setState("listening");
    r.start();
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-sky-700 to-sky-900 p-5 text-white shadow-lg">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-sky-200" />
        <h2 className="text-lg font-semibold">{t("voiceTitle")}</h2>
      </div>
      <p className="mt-1 text-sm text-sky-100">{t("voiceHint")}</p>

      <div className="mt-4 flex items-center gap-3">
        {canListen && (
          <button
            type="button"
            onClick={listen}
            disabled={state === "thinking"}
            aria-label={state === "listening" ? t("voiceStop") : t("voiceSpeak")}
            className={`relative flex size-14 shrink-0 items-center justify-center rounded-full transition disabled:opacity-60 ${
              state === "listening" ? "bg-red-500 text-white" : "bg-white text-sky-800 hover:bg-sky-50"
            }`}
          >
            {state === "listening" && <span className="absolute inset-0 animate-ping rounded-full bg-red-400/60" />}
            {state === "listening" ? <MicOff className="relative size-6" /> : <Mic className="size-6" />}
          </button>
        )}
        <div className="flex min-w-0 flex-1 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/20 focus-within:ring-white/60">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // inside the booking form: Enter must not submit it
                handsFree.current = false;
                void send(text);
              }
            }}
            maxLength={300}
            placeholder={state === "listening" ? t("voiceListening") : t("voicePlaceholder")}
            aria-label={t("voicePlaceholder")}
            className="h-12 min-w-0 flex-1 bg-transparent px-4 text-base text-white outline-none placeholder:text-sky-200"
          />
          <button
            type="button"
            onClick={() => {
              handsFree.current = false;
              void send(text);
            }}
            disabled={text.trim().length < 2 || state === "thinking" || state === "listening"}
            aria-label={t("voiceSend")}
            className="flex w-12 items-center justify-center text-white transition hover:bg-white/10 disabled:opacity-40"
          >
            {state === "thinking" ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
          </button>
        </div>
      </div>

      {state === "listening" && <p className="mt-3 text-sm text-sky-100">{t("voiceListening")}</p>}
      {state === "thinking" && <p className="mt-3 text-sm text-sky-100">{t("voiceThinking")}</p>}
      {message && (
        <div className={`mt-3 rounded-xl px-4 py-3 ${state === "error" ? "bg-red-500/20 text-red-50" : "bg-white/15 text-white"}`}>
          <div className="flex items-start gap-2">
            {state !== "error" && draft?.ask && <Volume2 className="mt-0.5 size-4 shrink-0 text-sky-200" />}
            <p className={draft?.ask && state !== "error" ? "font-semibold" : "text-sm"}>{message}</p>
          </div>
          {state !== "error" && draft?.ask && draft.choices.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={message}>
              {draft.choices.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    handsFree.current = false;
                    recognition.current?.stop();
                    void send("", { ask: draft.ask!, value: c.value });
                  }}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-sky-900 shadow-sm transition hover:bg-sky-50"
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {draft && (
        <button type="button" onClick={startOver} className="mt-3 inline-flex items-center gap-1.5 text-sm text-sky-100 hover:text-white">
          <RotateCcw className="size-3.5" /> {t("voiceStartOver")}
        </button>
      )}
    </div>
  );
}

/** The draft without the question fields, as the server expects it back. */
function strip(draft: VoiceDraft) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- these are the parts to leave out
  const { ask, choices, ...rest } = draft;
  return rest;
}
