import { getCaller, handle, parseBody } from "@/server/http";
import { SupplierSchema } from "@/server/suppliers/schemas";
import { registerSupplier } from "@/server/suppliers/suppliers.service";

/** Registers the caller as a supplier. Every update puts them back to "waiting for verification". */
export const POST = handle(async (req: Request) => {
  const caller = await getCaller(req);
  const input = await parseBody(req, SupplierSchema);
  return Response.json({ supplier: await registerSupplier(caller, input) });
});
