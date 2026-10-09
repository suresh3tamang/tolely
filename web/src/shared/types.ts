export type Role = "customer" | "supplier" | "admin";

export type BookingStatus = "pending" | "accepted" | "on_the_way" | "completed" | "cancelled";

export type PaymentMethod = "cash" | "qr"; // qr = eSewa / Khalti / Fonepay QR paid on delivery

// Rough bounding box of Nepal, to reject obviously wrong coordinates.
export const NEPAL_BOUNDS = { minLat: 26.3, maxLat: 30.5, minLng: 80.0, maxLng: 88.3 };

/** Languages the app is translated into (see mobile/lib/l10n). */
export const LANGUAGES = ["en", "ne"] as const;
export type Language = (typeof LANGUAGES)[number];
