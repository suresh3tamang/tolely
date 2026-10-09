import { z } from "zod";
import { getCaller, handle, parseBody } from "@/server/http";
import { markSeen } from "@/server/notifications/inbox";

const SeenSchema = z.object({ ids: z.array(z.string().min(1).max(64)).max(400).optional() });

/** Marks the caller's notifications as seen (the given ones, or all) so the bell's count goes away. */
export const POST = handle(async (req: Request) => {
  const caller = await getCaller(req);
  const { ids } = await parseBody(req, SeenSchema);
  const count = await markSeen(caller.uid, ids ?? "all");
  return Response.json({ ok: true, count });
});
