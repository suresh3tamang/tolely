// Push notification texts for booking events, in English and Nepali.

type B = { id: string; serviceNameEn: string; serviceNameNe: string; supplierName?: string | null };

export const messages = {
  newJob: (b: B & { optionLabelEn: string; optionLabelNe: string }) => ({
    bookingId: b.id,
    titleEn: "New job available",
    titleNe: "नयाँ काम आयो",
    bodyEn: `${b.serviceNameEn} · ${b.optionLabelEn}. Open Tolely to accept.`,
    bodyNe: `${b.serviceNameNe} · ${b.optionLabelNe}। स्वीकार गर्न Tolely खोल्नुहोस्।`,
  }),
  accepted: (b: B) => ({
    bookingId: b.id,
    titleEn: "Booking accepted",
    titleNe: "बुकिङ स्वीकार भयो",
    bodyEn: `${b.supplierName} will do your ${b.serviceNameEn} job.`,
    bodyNe: `${b.supplierName}ले तपाईंको ${b.serviceNameNe} काम गर्नुहुनेछ।`,
  }),
  onTheWay: (b: B) => ({
    bookingId: b.id,
    titleEn: "On the way",
    titleNe: "बाटोमा छ",
    bodyEn: `${b.supplierName} is on the way for your ${b.serviceNameEn}.`,
    bodyNe: `${b.supplierName} तपाईंको ${b.serviceNameNe}को लागि आउँदै हुनुहुन्छ।`,
  }),
  completed: (b: B) => ({
    bookingId: b.id,
    titleEn: "Job completed",
    titleNe: "काम सम्पन्न भयो",
    bodyEn: `How was your ${b.serviceNameEn}? Please rate the service.`,
    bodyNe: `${b.serviceNameNe} कस्तो भयो? कृपया मूल्याङ्कन गर्नुहोस्।`,
  }),
  released: (b: B) => ({
    bookingId: b.id,
    titleEn: "Finding another supplier",
    titleNe: "अर्को सप्लायर खोज्दै",
    bodyEn: `Your supplier couldn't make it. We're finding another for your ${b.serviceNameEn}.`,
    bodyNe: `तपाईंको सप्लायर आउन सक्नुभएन। ${b.serviceNameNe}को लागि अर्को खोज्दैछौं।`,
  }),
  cancelled: (b: B) => ({
    bookingId: b.id,
    titleEn: "Booking cancelled",
    titleNe: "बुकिङ रद्द भयो",
    bodyEn: `The ${b.serviceNameEn} booking was cancelled.`,
    bodyNe: `${b.serviceNameNe} बुकिङ रद्द गरियो।`,
  }),
};
