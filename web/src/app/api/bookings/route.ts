import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { after } from "next/server";
import { z } from "zod";
import { ApiError, handle, parseBody, requireRole } from "@/lib/api";
import { db } from "@/lib/firebase-admin";
import { findOption } from "@/lib/catalog";
import { messages } from "@/lib/messages";
import { notifySuppliers } from "@/lib/notify";

const DAY_MS = 24 * 60 * 60 * 1000;

const BookingSchema = z.object({
  serviceKey: z.string(),
  optionId: z.string(),
  address: z.string().trim().min(3, "Address is required").max(200),
  landmark: z.string().trim().max(200).default(""),
  scheduledFor: z.iso.datetime({ offset: true }),
  paymentMethod: z.enum(["cash", "qr"]).default("cash"),
  note: z.string().trim().max(500).default(""),
});

/** Customer creates a booking. Price is decided here, never by the app. */
export const POST = handle(async (req: Request) => {
  const caller = await requireRole(req, "customer");
  const body = await parseBody(req, BookingSchema);

  const match = await findOption(body.serviceKey, body.optionId);
  if (!match) throw new ApiError(400, "Unknown service or option");

  const when = new Date(body.scheduledFor).getTime();
  if (when < Date.now() - 15 * 60 * 1000 || when > Date.now() + 30 * DAY_MS) {
    throw new ApiError(400, "Choose a time within the next 30 days");
  }

  const user = await db().collection("users").doc(caller.uid).get();
  const ref = await db().collection("bookings").add({
    customerId: caller.uid,
    customerName: user.get("name") ?? "",
    customerPhone: caller.phone,
    serviceKey: match.service.key,
    serviceNameEn: match.service.nameEn,
    serviceNameNe: match.service.nameNe,
    optionId: match.option.id,
    optionLabelEn: match.option.labelEn,
    optionLabelNe: match.option.labelNe,
    price: match.option.price,
    address: body.address,
    landmark: body.landmark,
    note: body.note,
    paymentMethod: body.paymentMethod,
    scheduledFor: Timestamp.fromMillis(when),
    status: "pending",
    supplierId: null,
    supplierName: null,
    supplierPhone: null,
    rating: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  after(() =>
    notifySuppliers(
      match.service.key,
      messages.newJob({
        id: ref.id,
        serviceNameEn: match.service.nameEn,
        serviceNameNe: match.service.nameNe,
        optionLabelEn: match.option.labelEn,
        optionLabelNe: match.option.labelNe,
      }),
    ),
  );
  return Response.json({ id: ref.id, price: match.option.price }, { status: 201 });
});
