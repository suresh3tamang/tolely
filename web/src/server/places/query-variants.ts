// Spoken place names often don't match the map exactly: Nepali speech-to-text writes "बालकोट चोक", while the
// map knows "Balkot Chowk" or just "बालकोट". These helpers give other ways to write a query, tried in order
// when the first search finds nothing.

/** Generic words around a place name ("chowk", "tole", "bazar") that often stop a match. */
const GENERIC = /(^|\s)(chowk|chok|chauk|tole|tol|bazar|bazaar|marg|road|sadak|चोक|चौक|टोल|बजार|मार्ग|सडक|रोड)(?=\s|$)/giu;

const CONSONANTS: Record<string, string> = {
  क: "k", ख: "kh", ग: "g", घ: "gh", ङ: "ng", च: "ch", छ: "chh", ज: "j", झ: "jh", ञ: "n",
  ट: "t", ठ: "th", ड: "d", ढ: "dh", ण: "n", त: "t", थ: "th", द: "d", ध: "dh", न: "n",
  प: "p", फ: "ph", ब: "b", भ: "bh", म: "m", य: "y", र: "r", ल: "l", व: "w", श: "sh",
  ष: "sh", स: "s", ह: "h",
};
const VOWELS: Record<string, string> = {
  अ: "a", आ: "a", इ: "i", ई: "i", उ: "u", ऊ: "u", ए: "e", ऐ: "ai", ओ: "o", औ: "au", ऋ: "ri",
};
const SIGNS: Record<string, string> = {
  "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "u", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ृ": "ri",
};
const VIRAMA = "्";
const NASAL = new Set(["ं", "ँ"]);

/**
 * Devanagari -> plain Latin letters, the way names are usually written in English: "बालकोट" -> "balkot",
 * "कोटेश्वर" -> "koteshwar", "ठिमी" -> "thimi". Simple rules, good enough for place search.
 */
export function romanize(text: string): string {
  return text
    .split(/\s+/)
    .map((word) => {
      // Each syllable: consonant (with "a" unless a sign or virama follows), or a vowel letter.
      const parts: { text: string; inherent: boolean }[] = [];
      const chars = [...word];
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        const next = chars[i + 1];
        if (CONSONANTS[c]) {
          if (next === VIRAMA) {
            parts.push({ text: CONSONANTS[c], inherent: false });
            i++;
          } else if (next && SIGNS[next]) {
            parts.push({ text: CONSONANTS[c] + SIGNS[next], inherent: false });
            i++;
          } else {
            parts.push({ text: CONSONANTS[c] + "a", inherent: true });
          }
        } else if (VOWELS[c]) parts.push({ text: VOWELS[c], inherent: false });
        else if (NASAL.has(c)) parts.push({ text: "n", inherent: false });
        else if (!/[ऀ-ॿ]/.test(c)) parts.push({ text: c, inherent: false });
      }
      // Drop the unspoken "a": at the end of a word, and between a vowel and a consonant+vowel ("बालकोट" -> "balkot").
      for (let i = 0; i < parts.length; i++) {
        if (!parts[i].inherent) continue;
        const last = i === parts.length - 1 && parts.length > 1;
        const middle = i > 0 && i < parts.length - 1 && /[aeiou]$/.test(parts[i - 1].text) && /[aeiou]/.test(parts[i + 1].text);
        if (last || middle) parts[i] = { text: parts[i].text.slice(0, -1), inherent: false };
      }
      return parts.map((p) => p.text).join("");
    })
    .join(" ");
}

/** Other ways to write the query, best first, without repeats. The original query is not included. */
export function queryVariants(query: string): string[] {
  const variants: string[] = [];
  const add = (q: string) => {
    const clean = q.replace(/\s+/g, " ").trim();
    if (clean.length >= 2 && clean.toLowerCase() !== query.toLowerCase() && !variants.includes(clean)) variants.push(clean);
  };
  const withoutGeneric = query.replace(GENERIC, " ");
  // Spoken Nepali first in English letters (the map often has "Balkot Chowk" but not "बालकोट चोक"),
  // then without words like "chowk" (finds the area when the exact spot is not on the map).
  if (/[\u0900-\u097F]/.test(query)) add(romanize(query).replace(/\bchok\b/g, "chowk"));
  add(withoutGeneric);
  return variants.slice(0, 2); // each try waits about a second (OpenStreetMap's limit), so keep it short
}
