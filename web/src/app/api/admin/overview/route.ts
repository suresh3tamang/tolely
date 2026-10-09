import { handle, requireRole } from "@/server/http";
import { loadOverview } from "@/server/admin/admin.service";

export const GET = handle(async (req: Request) => {
  await requireRole(req, "admin");
  return Response.json(await loadOverview());
});
