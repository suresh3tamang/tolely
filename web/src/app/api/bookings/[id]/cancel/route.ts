import { handle, requireRole, type Params } from "@/server/http";
import { cancelBookingAsCustomer } from "@/server/bookings/bookings.service";

/** The customer cancels their own booking before the supplier is on the way. */
export const POST = handle(async (req: Request, ctx: Params<"id">) => {
  const caller = await requireRole(req, "customer");
  const { id } = await ctx.params;
  await cancelBookingAsCustomer(caller, id);
  return Response.json({ ok: true });
});
