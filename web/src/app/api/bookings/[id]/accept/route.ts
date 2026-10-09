import { handle, requireRole, type Params } from "@/server/http";
import { acceptBooking } from "@/server/bookings/bookings.service";

/** A verified supplier takes a pending job. First one to accept gets it. */
export const POST = handle(async (req: Request, ctx: Params<"id">) => {
  const caller = await requireRole(req, "supplier");
  const { id } = await ctx.params;
  await acceptBooking(caller, id);
  return Response.json({ ok: true });
});
