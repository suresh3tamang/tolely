import { z } from "zod";
import { LANGUAGES } from "@/shared/types";

export const CustomerProfileSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  address: z.string().trim().min(3, "Address is required").max(200),
  landmark: z.string().trim().max(200).default(""),
  language: z.enum(LANGUAGES).default("ne"),
});

export const LanguageSchema = z.object({ language: z.enum(LANGUAGES) });

export const DeviceSchema = z.object({
  token: z.string().min(10).max(4096),
  remove: z.boolean().default(false),
});

export type CustomerProfileInput = z.infer<typeof CustomerProfileSchema>;
