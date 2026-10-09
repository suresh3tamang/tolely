import { handle, parseBody, requireRole, type Params } from "@/server/http";
import { shareSupplierLocation } from "@/server/bookings/bookings.service";
import { LatLngSchema } from "@/shared/geo";

/** The assigned supplier shares where they are while on the way, for live tracking. */
export const POST = handle(async (req: Request, ctx: Params<"id">) => {
  const caller = await requireRole(req, "supplier");
  const { id } = await ctx.params;
  const point = await parseBody(req, LatLngSchema);
  await shareSupplierLocation(caller, id, point);
  return Response.json({ ok: true });
});
