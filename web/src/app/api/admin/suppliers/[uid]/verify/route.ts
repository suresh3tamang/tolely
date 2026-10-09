import { handle, parseBody, requireRole, type Params } from "@/server/http";
import { VerifySchema } from "@/server/suppliers/schemas";
import { setVerified } from "@/server/suppliers/suppliers.service";

/** Admin approves (or suspends) a supplier after checking their documents. */
export const POST = handle(async (req: Request, ctx: Params<"uid">) => {
  const admin = await requireRole(req, "admin");
  const { uid } = await ctx.params;
  const { verified } = await parseBody(req, VerifySchema);
  await setVerified(admin, uid, verified);
  return Response.json({ ok: true });
});
