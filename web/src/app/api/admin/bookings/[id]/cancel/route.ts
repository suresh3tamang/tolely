import { handle, requireRole, type Params } from "@/server/http";
import { cancelBookingAsAdmin } from "@/server/bookings/bookings.service";

/** Admin cancels any open booking (e.g. after a complaint or a no-show). */
export const POST = handle(async (req: Request, ctx: Params<"id">) => {
  const admin = await requireRole(req, "admin");
  const { id } = await ctx.params;
  await cancelBookingAsAdmin(admin, id);
  return Response.json({ ok: true });
});
