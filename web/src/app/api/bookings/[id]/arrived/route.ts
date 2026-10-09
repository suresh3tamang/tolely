import { handle, requireRole, type Params } from "@/server/http";
import { markArrived } from "@/server/bookings/bookings.service";

/** The assigned supplier says they have arrived; the customer is told. */
export const POST = handle(async (req: Request, ctx: Params<"id">) => {
  const caller = await requireRole(req, "supplier");
  const { id } = await ctx.params;
  await markArrived(caller, id);
  return Response.json({ ok: true });
});
