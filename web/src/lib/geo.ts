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
