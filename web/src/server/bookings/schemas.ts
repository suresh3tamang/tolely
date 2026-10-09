import { z } from "zod";
import { LatLngSchema } from "@/shared/geo";

export const CreateBookingSchema = z.object({
  serviceKey: z.string(),
  optionId: z.string(),
  address: z.string().trim().min(3, "Address is required").max(200),
  landmark: z.string().trim().max(200).default(""),
  scheduledFor: z.iso.datetime({ offset: true }),
  // The end of the time window the customer chose, e.g. 12:00 to 15:00. Optional: older apps send a single time.
  scheduledEnd: z.iso.datetime({ offset: true }).nullable().default(null),
  // Who the supplier should ask for, and which number to call (may differ from the account holder's).
  contactName: z.string().trim().max(80).default(""),
  contactPhone: z.string().trim().regex(/^(\+977\d{8,10})?$/, "Enter a valid Nepal phone number").default(""),
  paymentMethod: z.enum(["cash", "qr"]).default("cash"),
  note: z.string().trim().max(500).default(""),
  location: LatLngSchema.nullable().default(null),
});

export const StatusSchema = z.object({ status: z.enum(["pending", "on_the_way", "completed"]) });

export const RateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).default(""),
});

export const ReportSchema = z.object({ message: z.string().trim().min(5, "Please describe the problem").max(1000) });

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
