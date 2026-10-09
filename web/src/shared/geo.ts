import { z } from "zod";
import { NEPAL_BOUNDS as B } from "./types";

/** A map point inside Nepal. */
export const LatLngSchema = z.object(
  {
    lat: z.number().min(B.minLat).max(B.maxLat),
    lng: z.number().min(B.minLng).max(B.maxLng),
  },
  { error: "Location must be in Nepal" },
);

/** A point on the map. */
export type LatLng = z.infer<typeof LatLngSchema>;

/** Whether a point is inside Nepal's bounding box (the same check the server makes). */
export function isInNepal(point: LatLng): boolean {
  return (
    point.lat >= B.minLat && point.lat <= B.maxLat && point.lng >= B.minLng && point.lng <= B.maxLng
  );
}

/** The middle of Kathmandu: where maps start before we know where the person is. */
export const KATHMANDU: LatLng = { lat: 27.7172, lng: 85.324 };

/** Straight-line distance between two points, in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Rough minutes to arrive: roads are about 1.4 times longer than a straight line, and Kathmandu traffic
 * averages about 18 km/h. Shown as "about N min", never as a promise.
 */
export function etaMinutes(from: LatLng, to: LatLng): number {
  return Math.max(1, Math.round(((distanceKm(from, to) * 1.4) / 18) * 60));
}

/** Within this distance the supplier is "almost there". */
export const NEAR_KM = 0.5;
