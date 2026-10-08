import { getCatalog } from "@/lib/catalog";

export async function GET() {
  const services = await getCatalog();
  return Response.json({ services: services.filter((s) => s.active) });
}
