import type { Service } from "@/shared/services";

export type Booking = {
  id: string;
  serviceNameEn: string;
  optionLabelEn: string;
  price: number;
  status: string;
  customerName: string;
  customerPhone: string;
  supplierName: string | null;
  supplierPhone: string | null;
  address: string;
  landmark: string;
  note: string;
  paymentMethod: string;
  rating: number | null;
  platformFee?: number;
  supplierEarning?: number;
  location?: { lat: number; lng: number } | null;
  scheduledFor: string;
  scheduledEnd?: string | null;
  contactName?: string;
  contactPhone?: string;
  createdAt: string;
};

export type Supplier = {
  uid: string;
  name: string;
  phone: string;
  area: string;
  services: string[];
  vehicleNo: string;
  waterSource: string;
  verified: boolean;
  ratingSum: number;
  ratingCount: number;
  completedJobs: number;
  earningsTotal?: number;
  feesTotal?: number;
  feesSettled?: number;
  /** Platform fees the supplier still owes Tolely. */
  feeBalance?: number;
};

export type Complaint = {
  id: string;
  bookingId: string;
  serviceNameEn: string;
  reporterRole: string;
  reporterPhone: string;
  message: string;
  status: "open" | "resolved";
  resolution?: string;
  createdAt: string;
};

export type Settlement = {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  note: string;
  createdAt: string;
};

export type Overview = {
  bookings: Booking[];
  suppliers: Supplier[];
  complaints: Complaint[];
  settlements: Settlement[];
  services: Service[];
  settings: { platformFeePercent: number };
};
