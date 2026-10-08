import type { Service } from "@/lib/services";

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
  scheduledFor: string;
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

export type Overview = {
  bookings: Booking[];
  suppliers: Supplier[];
  complaints: Complaint[];
  services: Service[];
};
