import { handle, parseBody, requireRole } from "@/server/http";
import { createBooking } from "@/server/bookings/bookings.service";
import { CreateBookingSchema } from "@/server/bookings/schemas";

/** Customer creates a booking. Price is decided on the server, never by the app. */
export const POST = handle(async (req: Request) => {
  const caller = await requireRole(req, "customer");
  const input = await parseBody(req, CreateBookingSchema);
  return Response.json(await createBooking(caller, input), { status: 201 });
});
