import { ApiError, handle } from "@/server/http";
import { notifyLateBookings } from "@/server/bookings/bookings.service";

/**
 * GET /api/cron/late-bookings : tells customers when their booking is late (time window over, nobody on the
 * way) and reminds the supplier. Called every 10 minutes by a scheduler with `Authorization: Bearer CRON_SECRET`
 * (Vercel Cron sends this header itself). See docs/DEPLOYMENT.md.
 */
export const GET = handle(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) throw new ApiError(401, "Not allowed");
  const count = await notifyLateBookings();
  return Response.json({ ok: true, late: count });
});
