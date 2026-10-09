import { z } from "zod";
import { LANGUAGES } from "@/shared/types";

export const SupplierSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  area: z.string().trim().min(2, "Working area is required").max(120),
  services: z.array(z.string()).min(1, "Choose at least one service").max(20),
  vehicleNo: z.string().trim().max(30).default(""),
  waterSource: z.string().trim().max(200).default(""),
  language: z.enum(LANGUAGES).optional(),
});

export const AvailabilitySchema = z.object({ online: z.boolean() });

export const VerifySchema = z.object({ verified: z.boolean() });

export type SupplierInput = z.infer<typeof SupplierSchema>;

export const SettlementSchema = z.object({
  amount: z.number().int("Enter a whole number of rupees").min(1, "Enter an amount").max(1_000_000),
  note: z.string().trim().max(200).default(""),
});
