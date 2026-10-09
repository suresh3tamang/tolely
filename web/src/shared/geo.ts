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
