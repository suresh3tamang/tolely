import { handle, parseBody, requireRole, type Params } from "@/server/http";
import { SettlementSchema } from "@/server/suppliers/schemas";
import { recordSettlement } from "@/server/suppliers/suppliers.service";

/** Admin records a payment of platform fees from a supplier. */
export const POST = handle(async (req: Request, ctx: Params<"uid">) => {
  const admin = await requireRole(req, "admin");
  const { uid } = await ctx.params;
  const { amount, note } = await parseBody(req, SettlementSchema);
  return Response.json(await recordSettlement(admin, uid, amount, note));
});
