import { handle, parseBody, requireRole } from "@/server/http";
import { SettingsSchema } from "@/server/settings/schemas";
import { getSettings, saveSettings } from "@/server/settings/settings.service";

export const GET = handle(async (req: Request) => {
  await requireRole(req, "admin");
  return Response.json(await getSettings());
});

/** Changes business settings, such as the platform fee. */
export const PUT = handle(async (req: Request) => {
  const admin = await requireRole(req, "admin");
  const input = await parseBody(req, SettingsSchema);
  return Response.json(await saveSettings(admin, input));
});
