import { SERVICES } from "@/lib/services";

export function GET() {
  return Response.json({ services: SERVICES.filter((s) => s.active) });
}
