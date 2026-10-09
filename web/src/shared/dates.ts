// Dates in English or Nepali, the same in every browser and on the server.
// Browsers often don't include Nepali date names (Chrome shows "Fri, Oct 9" for "ne-NP"), so the names are here.
// Digits stay 0-9 in both languages, like prices. Keep in step with mobile/lib/core/utils/format.dart.

export type DateLang = "ne" | "en";

const WEEKDAYS = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  ne: ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"],
};
const WEEKDAYS_SHORT = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  // Nepali always uses the full name: "शुक्रबार", not "शुक्र".
  ne: ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"],
};
const MONTHS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ne: ["जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन", "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"],
};

/** Parts of a date. `utc` reads a date-only value ("2026-10-09T00:00Z") without the time zone moving it a day. */
function parts(date: Date, utc: boolean) {
  return utc
    ? { day: date.getUTCDate(), month: date.getUTCMonth(), weekday: date.getUTCDay(), hour: date.getUTCHours(), minute: date.getUTCMinutes() }
    : { day: date.getDate(), month: date.getMonth(), weekday: date.getDay(), hour: date.getHours(), minute: date.getMinutes() };
}

/** "Friday" / "शुक्रबार". */
export function weekdayName(date: Date, lang: DateLang, { utc = false } = {}): string {
  return WEEKDAYS[lang][parts(date, utc).weekday];
}

/** "Fri, 9 Oct" / "शुक्रबार, 9 अक्टोबर" (or the full weekday with `long`). */
export function formatDay(date: Date, lang: DateLang, { long = false, utc = false } = {}): string {
  const p = parts(date, utc);
  const weekday = (long ? WEEKDAYS : WEEKDAYS_SHORT)[lang][p.weekday];
  return `${weekday}, ${p.day} ${MONTHS[lang][p.month]}`;
}

/** "2:05 PM" / "दिउँसो 2:05" (Nepali says the part of the day instead of AM/PM). */
export function formatTime(date: Date, lang: DateLang): string {
  const { hour, minute } = parts(date, false);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const mm = String(minute).padStart(2, "0");
  if (lang === "en") return `${h12}:${mm} ${hour < 12 ? "AM" : "PM"}`;
  const part = hour < 4 ? "राति" : hour < 12 ? "बिहान" : hour < 16 ? "दिउँसो" : hour < 19 ? "बेलुका" : "राति";
  return `${part} ${h12}:${mm}`;
}

/** "9 Oct, 2:05 PM" / "9 अक्टोबर, दिउँसो 2:05": short, for timelines and lists. */
export function formatShortDateTime(date: Date, lang: DateLang): string {
  const p = parts(date, false);
  return `${p.day} ${MONTHS[lang][p.month]}, ${formatTime(date, lang)}`;
}

/** "Fri, 9 Oct, 12:00 PM – 3:00 PM" / "शुक्रबार, 9 अक्टोबर, दिउँसो 12:00 – बेलुका 3:00". */
export function formatWindow(start: Date, end: Date | null, lang: DateLang): string {
  return end
    ? `${formatDay(start, lang)}, ${formatTime(start, lang)} – ${formatTime(end, lang)}`
    : `${formatDay(start, lang)}, ${formatTime(start, lang)}`;
}
