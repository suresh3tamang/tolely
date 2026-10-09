import { z } from "zod";
import { ApiError, getCaller, handle } from "@/server/http";
import { createRateLimiter, searchPlaces } from "@/server/places/places.service";

const QuerySchema = z.object({
  q: z.string().trim().min(2, "Type at least 2 letters").max(100),
  lang: z.enum(["ne", "en"]).default("ne"),
});

// Each signed-in person may search 40 times a minute (suggestions while typing count). (This is per server instance:
// good enough to stop a runaway page, not a substitute for a shared limiter at large scale.)
const allow = createRateLimiter({ limit: 40, windowMs: 60_000 });

/** GET /api/places/search?q=Balkot%20chowk : places that match, best first. */
export const GET = handle(async (req: Request) => {
  const caller = await getCaller(req);
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid search");
  if (!allow(caller.uid)) throw new ApiError(429, "Too many searches. Please wait a moment.");

  return Response.json({ results: await searchPlaces(parsed.data.q, parsed.data.lang) });
});
