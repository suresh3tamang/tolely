// Push notification texts for booking events, in English and Nepali.

type B = { id: string; serviceNameEn: string; serviceNameNe: string; supplierName?: string | null };

/** What a notification is about; the apps pick an icon by it. */
export type NotificationType =
  | "new_job" | "accepted" | "on_the_way" | "near" | "arrived" | "completed"
  | "released" | "cancelled" | "late" | "delayed" | "reminder";

export const messages = {
  newJob: (b: B & { optionLabelEn: string; optionLabelNe: string }) => ({
    type: "new_job" as NotificationType,
    bookingId: b.id,
    titleEn: "New job available",
    titleNe: "नयाँ काम आयो",
    bodyEn: `${b.serviceNameEn} · ${b.optionLabelEn}. Open Tolely to accept.`,
    bodyNe: `${b.serviceNameNe} · ${b.optionLabelNe}। स्वीकार गर्न Tolely खोल्नुहोस्।`,
  }),
  accepted: (b: B) => ({
    type: "accepted" as NotificationType,
    bookingId: b.id,
    titleEn: "Booking accepted",
    titleNe: "बुकिङ स्वीकार भयो",
    bodyEn: `${b.supplierName} will do your ${b.serviceNameEn} job.`,
    bodyNe: `${b.supplierName}ले तपाईंको ${b.serviceNameNe} काम गर्नुहुनेछ।`,
  }),
  onTheWay: (b: B) => ({
    type: "on_the_way" as NotificationType,
    bookingId: b.id,
    titleEn: "On the way",
    titleNe: "बाटोमा छ",
    bodyEn: `${b.supplierName} is on the way for your ${b.serviceNameEn}.`,
    bodyNe: `${b.supplierName} तपाईंको ${b.serviceNameNe}को लागि आउँदै हुनुहुन्छ।`,
  }),
  completed: (b: B) => ({
    type: "completed" as NotificationType,
    bookingId: b.id,
    titleEn: "Job completed",
    titleNe: "काम सम्पन्न भयो",
    bodyEn: `How was your ${b.serviceNameEn}? Please rate the service.`,
    bodyNe: `${b.serviceNameNe} कस्तो भयो? कृपया मूल्याङ्कन गर्नुहोस्।`,
  }),
  released: (b: B) => ({
    type: "released" as NotificationType,
    bookingId: b.id,
    titleEn: "Finding another supplier",
    titleNe: "अर्को सप्लायर खोज्दै",
    bodyEn: `Your supplier couldn't make it. We're finding another for your ${b.serviceNameEn}.`,
    bodyNe: `तपाईंको सप्लायर आउन सक्नुभएन। ${b.serviceNameNe}को लागि अर्को खोज्दैछौं।`,
  }),
  cancelled: (b: B) => ({
    type: "cancelled" as NotificationType,
    bookingId: b.id,
    titleEn: "Booking cancelled",
    titleNe: "बुकिङ रद्द भयो",
    bodyEn: `The ${b.serviceNameEn} booking was cancelled.`,
    bodyNe: `${b.serviceNameNe} बुकिङ रद्द गरियो।`,
  }),
  near: (b: B & { minutes: number }) => ({
    type: "near" as NotificationType,
    bookingId: b.id,
    titleEn: "Almost there",
    titleNe: "नजिकै आइपुग्नुभयो",
    bodyEn: `${b.supplierName} is about ${b.minutes} min away.`,
    bodyNe: `${b.supplierName} करिब ${b.minutes} मिनेटमा आइपुग्नुहुन्छ।`,
  }),
  arrived: (b: B) => ({
    type: "arrived" as NotificationType,
    bookingId: b.id,
    titleEn: "Arrived",
    titleNe: "आइपुग्नुभयो",
    bodyEn: `${b.supplierName} has arrived for your ${b.serviceNameEn}.`,
    bodyNe: `${b.supplierName} तपाईंको ${b.serviceNameNe}को लागि आइपुग्नुभयो।`,
  }),
  /** The supplier says they will be late. */
  late: (b: B & { minutes: number }) => ({
    type: "late" as NotificationType,
    bookingId: b.id,
    titleEn: "Running late",
    titleNe: "ढिलो हुँदैछ",
    bodyEn: `${b.supplierName} is running about ${b.minutes} min late. Sorry for the wait.`,
    bodyNe: `${b.supplierName} करिब ${b.minutes} मिनेट ढिलो आउनुहुनेछ। पर्खाइको लागि माफ गर्नुहोस्।`,
  }),
  /** The booked time is over and nobody is on the way yet (sent automatically). */
  delayed: (b: B) => ({
    type: "delayed" as NotificationType,
    bookingId: b.id,
    titleEn: "Your booking is delayed",
    titleNe: "तपाईंको बुकिङ ढिलो भयो",
    bodyEn: b.supplierName
      ? `${b.supplierName} hasn't started yet for your ${b.serviceNameEn}. We've reminded them. You can call them from the booking.`
      : `We're still looking for a supplier for your ${b.serviceNameEn}. You can keep waiting or cancel.`,
    bodyNe: b.supplierName
      ? `${b.supplierName} तपाईंको ${b.serviceNameNe}को लागि अझै निस्कनुभएको छैन। हामीले सम्झाएका छौं। बुकिङबाट फोन गर्न सक्नुहुन्छ।`
      : `${b.serviceNameNe}को लागि अझै सप्लायर खोज्दैछौं। पर्खन वा रद्द गर्न सक्नुहुन्छ।`,
  }),
  /** To the supplier: the customer is waiting. */
  reminder: (b: B) => ({
    type: "reminder" as NotificationType,
    bookingId: b.id,
    titleEn: "Customer is waiting",
    titleNe: "ग्राहक पर्खिरहनुभएको छ",
    bodyEn: `The time for the ${b.serviceNameEn} job has passed. Start the trip, or tap "Running late".`,
    bodyNe: `${b.serviceNameNe} कामको समय बितिसक्यो। यात्रा सुरु गर्नुहोस्, वा "ढिलो हुँदैछ" थिच्नुहोस्।`,
  }),
};
