// "aile basirako gharma", "mero ghar", "yahi", "here": the customer means where they are now.
// Such phrases use the phone's current location instead of searching the map.
// Keep in step with mobile/lib/core/utils/here_words.dart.

const LATIN = [
  "mero ghar", "hamro ghar", "aile basirako", "ahile basirako", "basirako", "basirahe", "basdai", "baseko thau",
  "gharma", "ghar ma", "ghar mai", "yahi", "yahin", "yaha", "yahan", "here", "my home", "my house", "my place",
  "current location", "my location", "where i am", "where i'm", "this place",
];
const DEVANAGARI = ["मेरो घर", "हाम्रो घर", "बसिरहेको", "बसिराखेको", "बस्दै", "बसेको ठाउँ", "घरमा", "घर मा", "यहीँ", "यहीं", "यही", "यहाँ"];

/** True if the text asks for "where I am now" rather than naming a place. */
export function meansCurrentLocation(text: string): boolean {
  const t = ` ${text.toLowerCase().replace(/[.,!?।'"]/g, " ").replace(/\s+/g, " ").trim()} `;
  return LATIN.some((w) => t.includes(` ${w}`)) || DEVANAGARI.some((w) => t.includes(w));
}
