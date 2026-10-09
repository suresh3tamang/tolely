import { handle, parseBody, requireRole, type Params } from "@/server/http";
import { updateBookingStatus } from "@/server/bookings/bookings.service";
import { StatusSchema } from "@/server/bookings/schemas";

/** The assigned supplier moves the job forward, or releases it back to pending. */
export const POST = handle(async (req: Request, ctx: Params<"id">) => {
  const caller = await requireRole(req, "supplier");
  const { id } = await ctx.params;
  const { status } = await parseBody(req, StatusSchema);
  await updateBookingStatus(caller, id, status);
  return Response.json({ ok: true });
});
