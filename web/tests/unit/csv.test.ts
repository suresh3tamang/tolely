import { describe, expect, it } from "vitest";
import { bookingsToCsv, csvCell } from "@/app/admin/csv";
import type { Booking } from "@/app/admin/types";

const booking = (extra: Partial<Booking> = {}): Booking => ({
  id: "b1",
  serviceNameEn: "Water Tanker",
  optionLabelEn: "8,000 Liters",
  price: 3200,
  status: "completed",
  customerName: "Suresh Tamang",
  customerPhone: "+9779800000001",
  supplierName: "Hari",
  supplierPhone: "+9779800000002",
  address: "Balkot",
  landmark: "",
  note: "",
  paymentMethod: "cash",
  rating: 5,
  platformFee: 256,
  supplierEarning: 2944,
  scheduledFor: "2026-10-09T06:00:00.000Z",
  createdAt: "2026-10-09T04:00:00.000Z",
  ...extra,
});

describe("CSV export", () => {
  it("quotes cells with commas, quotes and new lines", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("Balkot, Bhaktapur")).toBe('"Balkot, Bhaktapur"');
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(0)).toBe("0");
  });

  it("leaves plain phone numbers and numbers untouched", () => {
    expect(csvCell("+9779800000001")).toBe("+9779800000001");
    expect(csvCell("-5")).toBe("-5");
    expect(csvCell(3200)).toBe("3200");
  });

  it("neutralises spreadsheet formulas typed by users", () => {
    for (const evil of ["=HYPERLINK(\"http://evil\")", "+1+1", "-2+3", "@SUM(A1)"]) {
      expect(csvCell(evil).replace(/^"/, "").startsWith("'"), evil).toBe(true);
    }
  });

  it("has a header and one row per booking, with fee and earnings", () => {
    const lines = bookingsToCsv([booking(), booking({ id: "b2", platformFee: undefined, supplierName: null })]).split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("Booking id");
    expect(lines[1]).toBe(
      "b1,2026-10-09T04:00:00.000Z,2026-10-09T06:00:00.000Z,completed,Water Tanker,\"8,000 Liters\",Suresh Tamang,+9779800000001,Hari,3200,256,2944,cash,5",
    );
    expect(lines[2].startsWith("b2,")).toBe(true);
  });

  it("is just a header when there are no bookings", () => {
    expect(bookingsToCsv([]).split("\n")).toHaveLength(1);
  });
});
