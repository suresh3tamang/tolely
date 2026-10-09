import type { Booking } from "./types";

// A plain number or phone number such as +9779800000001 or -5 is safe as it is.
const PLAIN_NUMBER = /^[+-]?[\d\s()-]+$/;

/** One cell of a CSV file, quoted when needed. */
export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  // Text typed by users that starts with = + - @ can run as a formula when the
  // file is opened in a spreadsheet, so mark it as text. Plain numbers are left alone.
  if (/^[=+\-@]/.test(text) && !PLAIN_NUMBER.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const HEADER = [
  "Booking id", "Created", "Scheduled", "Until", "Status", "Service", "Option", "Customer", "Customer phone", "Contact person", "Contact phone",
  "Supplier", "Price (Rs)", "Fee (Rs)", "Supplier earns (Rs)", "Payment", "Rating",
];

/** Bookings as CSV text (for Excel / Google Sheets). */
export function bookingsToCsv(bookings: Booking[]): string {
  const rows = bookings.map((b) => [
    b.id, b.createdAt, b.scheduledFor, b.scheduledEnd ?? "", b.status, b.serviceNameEn, b.optionLabelEn,
    b.customerName, b.customerPhone, b.contactName ?? "", b.contactPhone ?? "", b.supplierName ?? "", b.price,
    b.platformFee ?? "", b.supplierEarning ?? "", b.paymentMethod, b.rating ?? "",
  ]);
  return [HEADER, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
