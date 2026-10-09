import { getCatalog } from "@/server/catalog/catalog.service";

export async function GET() {
  const services = await getCatalog();
  return Response.json({ services: services.filter((s) => s.active) });
}
