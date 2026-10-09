import { Droplets, Hammer, PaintRoller, Snowflake, Sparkles, Truck, Wrench, Zap, type LucideIcon } from "lucide-react";

// Web preview of the icons the mobile app shows for each service.
// A service stores an icon NAME (see SERVICE_ICONS in shared/services.ts).
const ICONS: Record<string, LucideIcon> = {
  water_drop: Droplets,
  cleaning_services: Sparkles,
  plumbing: Wrench,
  electrical_services: Zap,
  local_shipping: Truck,
  format_paint: PaintRoller,
  ac_unit: Snowflake,
  carpenter: Hammer,
  handyman: Hammer,
};

/** The icon for a service's icon name. */
export function ServiceGlyph({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Hammer;
  return <Icon className={className} />;
}
