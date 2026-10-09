import { handle, parseBody, requireRole } from "@/server/http";
import { AvailabilitySchema } from "@/server/suppliers/schemas";
import { setOnline } from "@/server/suppliers/suppliers.service";

/** Supplier goes online (gets new-job alerts) or offline. */
export const POST = handle(async (req: Request) => {
  const caller = await requireRole(req, "supplier");
  const { online } = await parseBody(req, AvailabilitySchema);
  await setOnline(caller, online);
  return Response.json({ ok: true });
});
