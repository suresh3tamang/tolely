import { handle, parseBody, requireRole, type Params } from "@/server/http";
import { rateBooking } from "@/server/bookings/bookings.service";
import { RateSchema } from "@/server/bookings/schemas";

/** The customer rates a completed job once. */
export const POST = handle(async (req: Request, ctx: Params<"id">) => {
  const caller = await requireRole(req, "customer");
  const { id } = await ctx.params;
  const { rating, comment } = await parseBody(req, RateSchema);
  await rateBooking(caller, id, rating, comment);
  return Response.json({ ok: true });
});
