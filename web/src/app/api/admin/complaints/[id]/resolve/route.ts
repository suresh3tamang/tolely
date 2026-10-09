import { z } from "zod";
import { handle, parseBody, requireRole, type Params } from "@/server/http";
import { resolveComplaint } from "@/server/admin/admin.service";

const ResolveSchema = z.object({ resolution: z.string().trim().min(2, "Write what was done").max(1000) });

/** Admin closes a complaint with a note about what was done. */
export const POST = handle(async (req: Request, ctx: Params<"id">) => {
  const admin = await requireRole(req, "admin");
  const { id } = await ctx.params;
  const { resolution } = await parseBody(req, ResolveSchema);
  await resolveComplaint(admin, id, resolution);
  return Response.json({ ok: true });
});
