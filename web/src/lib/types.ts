export type Role = "customer" | "supplier" | "admin";

export type BookingStatus = "pending" | "accepted" | "on_the_way" | "completed" | "cancelled";

export type PaymentMethod = "cash" | "qr"; // qr = eSewa / Khalti / Fonepay QR paid on delivery

// Which statuses a supplier may move a booking to, from each status.
// accepted -> pending means the supplier releases the job for someone else.
export const SUPPLIER_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  accepted: ["on_the_way", "pending"],
  on_the_way: ["completed"],
};

// A customer may cancel until the supplier is on the way.
export const CUSTOMER_CANCELLABLE: BookingStatus[] = ["pending", "accepted"];
