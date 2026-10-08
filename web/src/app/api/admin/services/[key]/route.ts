import { revalidateTag } from "next/cache";
import { z } from "zod";
import { ApiError, handle, parseBody, requireRole } from "@/lib/api";
import { CATALOG_TAG } from "@/lib/catalog";
import { db } from "@/lib/firebase-admin";
import { DEFAULT_SERVICES, SERVICE_ICONS } from "@/lib/services";

const OptionSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/, "Option id: letters, numbers, - and _ only"),
  labelEn: z.string().trim().min(1).max(80),
  labelNe: z.string().trim().min(1).max(80),
  price: z.number().int().min(0).max(1_000_000),
});

const ServiceSchema = z.object({
  nameEn: z.string().trim().min(2).max(60),
  nameNe: z.string().trim().min(1).max(60),
  icon: z.enum(SERVICE_ICONS),
  active: z.boolean(),
  options: z
    .array(OptionSchema)
    .min(1, "Add at least one option")
    .max(20)
    .refine((opts) => new Set(opts.map((o) => o.id)).size === opts.length, "Option ids must be unique"),
});

/**
 * Creates or updates one service. The first save copies the default catalog
 * into Firestore so the other services don't disappear.
 */
export const PUT = handle(async (req: Request, ctx: { params: Promise<{ key: string }> }) => {
  await requireRole(req, "admin");
  const { key } = await ctx.params;
  if (!/^[a-z0-9_]{2,30}$/.test(key)) throw new ApiError(400, "Service key: lowercase letters, numbers and _ only");
  const body = await parseBody(req, ServiceSchema);

  const col = db().collection("services");
  const existing = await col.get();
  const batch = db().batch();
  if (existing.empty) {
    DEFAULT_SERVICES.forEach((s, order) => batch.set(col.doc(s.key), { ...s, order }));
  }
  // Keep a service's place in the list; new services go at the end.
  const defaultIndex = DEFAULT_SERVICES.findIndex((s) => s.key === key);
  const order =
    existing.docs.find((d) => d.id === key)?.get("order") ??
    (defaultIndex >= 0 ? defaultIndex : DEFAULT_SERVICES.length + existing.size);
  batch.set(col.doc(key), { key, ...body, order });
  await batch.commit();

  revalidateTag(CATALOG_TAG, "max");
  return Response.json({ ok: true });
});
