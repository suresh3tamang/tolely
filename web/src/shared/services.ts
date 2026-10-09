// Default service catalog. The live catalog is stored in Firestore
// (`services` collection) and edited from the admin dashboard; these defaults
// are used until an admin saves the catalog for the first time.

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
  icon: string; // one of SERVICE_ICONS, mapped to a Material icon in the Flutter app
  active: boolean;
  options: ServiceOption[];
};

// Icons the mobile app knows how to draw. Add to both lists together.
export const SERVICE_ICONS = [
  "water_drop",
  "cleaning_services",
  "plumbing",
  "electrical_services",
  "local_shipping",
  "format_paint",
  "ac_unit",
  "carpenter",
  "handyman",
] as const;

export const DEFAULT_SERVICES: Service[] = [
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
  // Ready to switch on from the admin dashboard when suppliers join.
  {
    key: "shifting",
    nameEn: "House Shifting",
    nameNe: "घर सार्ने",
    icon: "local_shipping",
    active: false,
    options: [
      { id: "mini_truck", labelEn: "Mini truck (1–2 rooms)", labelNe: "सानो ट्रक (१–२ कोठा)", price: 4000 },
      { id: "truck", labelEn: "Truck (3+ rooms)", labelNe: "ट्रक (३+ कोठा)", price: 8000 },
    ],
  },
  {
    key: "home_cleaning",
    nameEn: "Home Cleaning",
    nameNe: "घर सफाई",
    icon: "cleaning_services",
    active: false,
    options: [
      { id: "room", labelEn: "Per room", labelNe: "प्रति कोठा", price: 800 },
      { id: "deep", labelEn: "Full house deep clean", labelNe: "पूरै घर गहिरो सफाई", price: 6000 },
    ],
  },
];
