import { handle, parseBody, requireRole, type Params } from "@/server/http";
import { reportProblem } from "@/server/bookings/bookings.service";
import { ReportSchema } from "@/server/bookings/schemas";

/** Customer or assigned supplier reports a problem with a booking; admins follow up. */
export const POST = handle(async (req: Request, ctx: Params<"id">) => {
  const caller = await requireRole(req, "customer", "supplier");
  const { id } = await ctx.params;
  const { message } = await parseBody(req, ReportSchema);
  await reportProblem(caller, id, message);
  return Response.json({ ok: true }, { status: 201 });
});
