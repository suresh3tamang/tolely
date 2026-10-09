import { z } from "zod";

/** Highest fee the admin console accepts: a typo like "80" must not slip through. */
export const MAX_FEE_PERCENT = 30;

export const SettingsSchema = z.object({
  platformFeePercent: z
    .number()
    .min(0, "Fee can't be negative")
    .max(MAX_FEE_PERCENT, `Fee can't be more than ${MAX_FEE_PERCENT}%`)
    .multipleOf(0.5, "Use steps of 0.5 (for example 7.5)"),
});

export type Settings = z.infer<typeof SettingsSchema>;
