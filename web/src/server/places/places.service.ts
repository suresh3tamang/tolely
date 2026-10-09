import "server-only";
import { isInNepal } from "@/shared/geo";
import { ApiError } from "@/server/http";
import { queryVariants } from "./query-variants";

// Place search ("Balkot chowk" → a spot on the map) using OpenStreetMap's free Nominatim service.
//
// Nominatim's usage rules, which this file follows:
//   * identify the app with a real User-Agent (the browser can't set one, so we search from the server)
//   * at most 1 request per second
//   * no search-as-you-type: callers search when the person presses Search
//   * cache repeated searches
// Before heavy traffic, switch `searchUrl` to a paid geocoder (the callers don't change).

export type Place = {
  id: string;
  /** The place's own name, e.g. "Balkot Chowk". */
  label: string;
  /** Where it is, e.g. "Suryabinayak-02 · Bhaktapur". */
  detail: string;
  lat: number;
  lng: number;
};

export type PlaceSearchOptions = {
  fetchImpl?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  /** Smallest gap between two requests to Nominatim. */
  minGapMs?: number;
  cacheTtlMs?: number;
  cacheMax?: number;
};

const SEARCH_URL = "https://nominatim.openstreetmap.org/search";
// Left, top, right, bottom of the Kathmandu valley: results there are preferred (not required).
const VALLEY_VIEWBOX = "85.15,27.85,85.55,27.55";
const USER_AGENT =
  process.env.PLACES_USER_AGENT ?? "Tolely/1.0 (local services booking, Nepal; https://github.com/suresh3tamang/tolely)";

type NominatimItem = {
  place_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
};

/** Turns one Nominatim result into a short label and a "where" line. */
export function toPlace(item: NominatimItem): Place | null {
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !item.display_name) return null;

  const parts = item.display_name
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const label = item.name?.trim() || parts[0] || "";
  if (!label) return null;

  // The rest of the address, without repeating the name, at most three parts.
  const detail = [...new Set(parts.slice(item.name?.trim() === parts[0] ? 1 : 0))]
    .filter((p) => p !== label)
    .slice(0, 3)
    .join(" · ");

  return { id: String(item.place_id ?? `${lat},${lng}`), label, detail, lat, lng };
}

export function createPlaceSearch(options: PlaceSearchOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const minGapMs = options.minGapMs ?? 1100;
  const cacheTtlMs = options.cacheTtlMs ?? 10 * 60_000;
  const cacheMax = options.cacheMax ?? 500;

  const cache = new Map<string, { at: number; places: Place[] }>();
  // Searches wait in line so two people searching at once still stay under 1 request per second.
  let queue: Promise<unknown> = Promise.resolve();
  let lastRequestAt = 0;

  async function ask(query: string, lang: string): Promise<Place[]> {
    const wait = lastRequestAt + minGapMs - now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = now();

    const url = new URL(SEARCH_URL);
    url.search = new URLSearchParams({
      format: "jsonv2",
      q: query,
      limit: "6",
      countrycodes: "np",
      viewbox: VALLEY_VIEWBOX,
      bounded: "0",
      "accept-language": lang === "en" ? "en,ne" : "ne,en",
    }).toString();

    let res: Response;
    try {
      res = await fetchImpl(url, { headers: { "user-agent": USER_AGENT, accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    } catch {
      throw new ApiError(502, "Place search is not working right now. Please try again.");
    }
    if (!res.ok) throw new ApiError(502, "Place search is busy. Please try again in a moment.");

    const items = (await res.json().catch(() => [])) as NominatimItem[];
    const seen = new Set<string>();
    const places: Place[] = [];
    for (const item of Array.isArray(items) ? items : []) {
      const place = toPlace(item);
      if (!place || !isInNepal(place)) continue;
      const key = `${place.label}|${place.lat.toFixed(3)}|${place.lng.toFixed(3)}`; // the same spot listed twice
      if (seen.has(key)) continue;
      seen.add(key);
      places.push(place);
    }
    return places;
  }

  return async function search(rawQuery: string, lang = "ne"): Promise<Place[]> {
    const query = rawQuery.replace(/\s+/g, " ").trim();
    const key = `${lang}|${query.toLowerCase()}`;

    const hit = cache.get(key);
    if (hit && now() - hit.at < cacheTtlMs) return hit.places;

    const queued = (q: string) => {
      const run = queue.then(() => ask(q, lang));
      queue = run.catch(() => undefined); // one failed search must not block the next
      return run;
    };
    let places = await queued(query);
    // Nothing found: try other ways of writing it ("बालकोट चोक" -> "बालकोट", "balkot chowk").
    for (const variant of places.length ? [] : queryVariants(query)) {
      places = await queued(variant);
      if (places.length) break;
    }

    if (cache.size >= cacheMax) cache.delete(cache.keys().next().value!); // drop the oldest
    cache.set(key, { at: now(), places });
    return places;
  };
}

export const searchPlaces = createPlaceSearch();

/** A simple "N requests per window" limiter, per key (used per signed-in person). */
export function createRateLimiter({ limit, windowMs, now = Date.now }: { limit: number; windowMs: number; now?: () => number }) {
  const hits = new Map<string, number[]>();
  return function allow(key: string): boolean {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((at) => t - at < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(t);
    hits.set(key, recent);
    return true;
  };
}
