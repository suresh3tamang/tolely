import { handle, parseBody, requireRole, type Params } from "@/server/http";
import { reportLate } from "@/server/bookings/bookings.service";
import { LateSchema } from "@/server/bookings/schemas";

/** The assigned supplier says they will be late; the customer is told. */
export const POST = handle(async (req: Request, ctx: Params<"id">) => {
  const caller = await requireRole(req, "supplier");
  const { id } = await ctx.params;
  const { minutes } = await parseBody(req, LateSchema);
  await reportLate(caller, id, minutes);
  return Response.json({ ok: true });
});
