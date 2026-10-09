import { getCaller, handle, parseBody } from "@/server/http";
import { DeviceSchema } from "@/server/profiles/schemas";
import { setDeviceToken } from "@/server/profiles/profiles.service";

/** Registers (or on logout, removes) this phone's push notification token. */
export const POST = handle(async (req: Request) => {
  const caller = await getCaller(req);
  const { token, remove } = await parseBody(req, DeviceSchema);
  await setDeviceToken(caller, token, remove);
  return Response.json({ ok: true });
});
