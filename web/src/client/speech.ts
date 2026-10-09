// Speech recognition in the browser (Chrome, Edge, Safari): free, runs on the device or the browser's service.

// The browser's speech recognition (Chrome, Edge, Safari). Not in TypeScript's DOM types yet.
export type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

export function makeRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** The recognition language for the page language. */
export function speechLang(lang: "ne" | "en"): string {
  return lang === "ne" ? "ne-NP" : "en-IN";
}
