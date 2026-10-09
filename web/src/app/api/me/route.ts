import { handle, getCaller, parseBody } from "@/server/http";
import { CustomerProfileSchema, LanguageSchema } from "@/server/profiles/schemas";
import { deleteAccount, getSession, saveCustomerProfile, saveLanguage } from "@/server/profiles/profiles.service";

/** The signed-in user's profile, plus their supplier record if they have one. */
export const GET = handle(async (req: Request) => {
  const { uid } = await getCaller(req);
  return Response.json(await getSession(uid));
});

/** Creates or updates the profile. New users start as customers. */
export const POST = handle(async (req: Request) => {
  const caller = await getCaller(req);
  const input = await parseBody(req, CustomerProfileSchema);
  return Response.json({ user: await saveCustomerProfile(caller, input) });
});

/** Changes only the preferred language. */
export const PATCH = handle(async (req: Request) => {
  const caller = await getCaller(req);
  const { language } = await parseBody(req, LanguageSchema);
  return Response.json({ saved: await saveLanguage(caller, language) });
});

/** Deletes the account (required by the app stores). */
export const DELETE = handle(async (req: Request) => {
  const caller = await getCaller(req);
  await deleteAccount(caller);
  return Response.json({ ok: true });
});
