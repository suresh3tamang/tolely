// Service catalog. The server is the source of truth for prices: the app only
// sends the service key and option id, and the price is looked up here.
// To add a new service (painter, AC repair, shifting van...), add an entry.

export type ServiceOption = {
  id: string;
  labelEn: string;
  labelNe: string;
  price: number; // NPR
};

export type Service = {
  key: string;
  nameEn: string;
  nameNe: string;
  icon: string; // Material icon name, mapped in the Flutter app
  active: boolean;
  options: ServiceOption[];
};

export const SERVICES: Service[] = [
  {
    key: "tanker",
    nameEn: "Water Tanker",
    nameNe: "पानी ट्याङ्कर",
    icon: "water_drop",
    active: true,
    options: [
      { id: "6000L", labelEn: "6,000 Liters", labelNe: "६,००० लिटर", price: 2500 },
      { id: "8000L", labelEn: "8,000 Liters", labelNe: "८,००० लिटर", price: 3200 },
      { id: "12000L", labelEn: "12,000 Liters", labelNe: "१२,००० लिटर", price: 4500 },
    ],
  },
  {
    key: "tank_cleaning",
    nameEn: "Tank Cleaning",
    nameNe: "ट्याङ्की सफाई",
    icon: "cleaning_services",
    active: true,
    options: [
      { id: "small", labelEn: "Up to 1,000 L tank", labelNe: "१,००० लिटरसम्मको ट्याङ्की", price: 1500 },
      { id: "large", labelEn: "Up to 5,000 L tank", labelNe: "५,००० लिटरसम्मको ट्याङ्की", price: 3000 },
      { id: "underground", labelEn: "Underground tank", labelNe: "भूमिगत ट्याङ्की", price: 5000 },
    ],
  },
  {
    key: "plumber",
    nameEn: "Plumber",
    nameNe: "प्लम्बर",
    icon: "plumbing",
    active: true,
    options: [
      { id: "visit", labelEn: "Visit + inspection", labelNe: "भ्रमण + जाँच", price: 500 },
      { id: "motor", labelEn: "Water motor repair", labelNe: "पानी मोटर मर्मत", price: 1200 },
    ],
  },
  {
    key: "electrician",
    nameEn: "Electrician",
    nameNe: "इलेक्ट्रिसियन",
    icon: "electrical_services",
    active: true,
    options: [
      { id: "visit", labelEn: "Visit + inspection", labelNe: "भ्रमण + जाँच", price: 500 },
      { id: "wiring", labelEn: "Wiring fault repair", labelNe: "वायरिङ मर्मत", price: 1500 },
    ],
  },
];

export function findOption(serviceKey: string, optionId: string) {
  const service = SERVICES.find((s) => s.key === serviceKey && s.active);
  const option = service?.options.find((o) => o.id === optionId);
  return service && option ? { service, option } : null;
}
