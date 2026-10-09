import { handle, parseBody, requireRole, type Params } from "@/server/http";
import { ServiceSchema } from "@/server/catalog/schemas";
import { saveService } from "@/server/catalog/catalog.service";

/** Creates or updates one service (name, icon, prices, on/off). */
export const PUT = handle(async (req: Request, ctx: Params<"key">) => {
  await requireRole(req, "admin");
  const { key } = await ctx.params;
  const input = await parseBody(req, ServiceSchema);
  await saveService(key, input);
  return Response.json({ ok: true });
});
