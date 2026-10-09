import { z } from "zod";
import { SERVICE_ICONS } from "@/shared/services";

const OptionSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/, "Option id: letters, numbers, - and _ only"),
  labelEn: z.string().trim().min(1).max(80),
  labelNe: z.string().trim().min(1).max(80),
  price: z.number().int().min(0).max(1_000_000),
});

/** What the admin console sends when saving one service. */
export const ServiceSchema = z.object({
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

export type ServiceInput = z.infer<typeof ServiceSchema>;

export const SERVICE_KEY = /^[a-z0-9_]{2,30}$/;
