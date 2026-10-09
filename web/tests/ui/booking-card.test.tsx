// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/client/firebase";
import { BookingCard, type WebBooking } from "@/app/book/my-bookings";
import { renderPage } from "./helpers";

vi.mock("@/client/firebase", () => ({ apiFetch: vi.fn(), clientAuth: vi.fn(), clientDb: vi.fn() }));
// The real map needs a browser; this stand-in shows where the markers would be.
vi.mock("@/app/book/tracking-map-lazy", () => ({
  TrackingMap: ({ supplier }: { supplier: { lat: number } | null }) => <div data-testid="live-map">{supplier ? "supplier on map" : "no supplier yet"}</div>,
}));

const base: WebBooking = {
  id: "b1",
  status: "pending",
  serviceNameEn: "Water Tanker",
  serviceNameNe: "पानी ट्याङ्कर",
  optionLabelEn: "8,000 Liters",
  optionLabelNe: "८,००० लिटर",
  price: 3200,
  address: "Balkot, Bhaktapur",
  landmark: "Near the temple",
  scheduledFor: new Date("2026-10-12T10:00:00"),
  scheduledEnd: null,
  contactName: "",
  contactPhone: "",
  createdAt: null,
  acceptedAt: null,
  departedAt: null,
  arrivedAt: null,
  completedAt: null,
  cancelledAt: null,
  supplierLocation: null,
  lateByMinutes: null,
  location: null,
  supplierName: null,
  supplierPhone: null,
  vehicleNo: null,
  supplierRating: null,
  supplierRatingCount: 0,
  supplierJobs: 0,
  rating: null,
};

const withSupplier = (extra: Partial<WebBooking> = {}): WebBooking => ({
  ...base,
  status: "accepted",
  supplierName: "Hari Tamang",
  supplierPhone: "+9779800000002",
  vehicleNo: "Ba 2 Kha 1234",
  supplierRating: 4.6,
  supplierRatingCount: 5,
  supplierJobs: 12,
  ...extra,
});

beforeEach(() => {
  vi.mocked(apiFetch).mockReset().mockResolvedValue({ ok: true });
});

describe("a booking on the website", () => {
  it("shows what was booked, when and where", () => {
    renderPage(<BookingCard booking={base} />);
    expect(screen.getByText("Water Tanker")).toBeTruthy();
    expect(screen.getByText("Rs 3,200")).toBeTruthy();
    expect(screen.getByText("Balkot, Bhaktapur · Near the temple")).toBeTruthy();
  });

  it("links to the pin the customer placed on the map", () => {
    renderPage(<BookingCard booking={{ ...base, location: { lat: 27.7172, lng: 85.324 } }} />);
    const link = screen.getByRole("link", { name: "View on map" });
    expect(link.getAttribute("href")).toBe("https://www.google.com/maps?q=27.7172,85.324");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("has no map link for a booking without a pin", () => {
    renderPage(<BookingCard booking={base} />);
    expect(screen.queryByRole("link", { name: "View on map" })).toBeNull();
  });

  it("while waiting for a supplier it says so", () => {
    renderPage(<BookingCard booking={base} />);
    expect(screen.getByText("Finding a supplier")).toBeTruthy();
    expect(screen.getByText(/We are finding a supplier/)).toBeTruthy();
    expect(screen.queryByText("Call")).toBeNull();
  });

  it("once accepted, shows the supplier with rating, jobs and a call link", () => {
    renderPage(<BookingCard booking={withSupplier()} />);
    expect(screen.getAllByText("Accepted")).toHaveLength(2); // the status badge and the step
    expect(screen.getByText("Hari Tamang")).toBeTruthy();
    expect(screen.getByText(/4\.6 \(5\)/)).toBeTruthy();
    expect(screen.getByText(/12 jobs/)).toBeTruthy();
    expect(screen.getByText(/Ba 2 Kha 1234/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Call/ }).getAttribute("href")).toBe("tel:+9779800000002");
  });

  it("a supplier without ratings yet is shown as new", () => {
    renderPage(<BookingCard booking={withSupplier({ supplierRating: null, supplierRatingCount: 0, supplierJobs: 1 })} />);
    expect(screen.getByText(/New supplier/)).toBeTruthy();
    expect(screen.getByText(/New supplier · 1 job/)).toBeTruthy();
  });

  it("is shown in Nepali too", () => {
    renderPage(<BookingCard booking={withSupplier()} />, "ne");
    expect(screen.getByText("पानी ट्याङ्कर")).toBeTruthy();
    expect(screen.getAllByText("स्वीकार भयो")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /फोन गर्नुहोस्/ })).toBeTruthy();
  });

  describe("cancelling", () => {
    it("asks first, then cancels", async () => {
      renderPage(<BookingCard booking={base} />);
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "Cancel booking" }));
      expect(screen.getByText("Cancel this booking?")).toBeTruthy();
      expect(apiFetch).not.toHaveBeenCalled(); // not yet

      await user.click(within_dialog("Cancel booking"));
      await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/api/bookings/b1/cancel", { method: "POST" }));
    });

    it("can be kept", async () => {
      renderPage(<BookingCard booking={base} />);
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Cancel booking" }));
      await user.click(screen.getByRole("button", { name: "Keep it" }));
      expect(apiFetch).not.toHaveBeenCalled();
      expect(screen.queryByText("Cancel this booking?")).toBeNull();
    });

    it("is not offered once the supplier is on the way, or when finished", () => {
      for (const status of ["on_the_way", "completed", "cancelled"] as const) {
        const { unmount } = renderPage(<BookingCard booking={withSupplier({ status })} />);
        expect(screen.queryByRole("button", { name: "Cancel booking" }), status).toBeNull();
        unmount();
      }
    });
  });

  describe("rating", () => {
    it("a finished job can be rated, once", async () => {
      renderPage(<BookingCard booking={withSupplier({ status: "completed" })} />);
      const user = userEvent.setup();
      expect(screen.getByText("How was the service?")).toBeTruthy();

      await user.click(screen.getByRole("button", { name: "4" }));
      await waitFor(() =>
        expect(apiFetch).toHaveBeenCalledWith("/api/bookings/b1/rate", { method: "POST", body: JSON.stringify({ rating: 4 }) }),
      );
    });

    it("after rating, the stars are fixed", () => {
      renderPage(<BookingCard booking={withSupplier({ status: "completed", rating: 5 })} />);
      expect(screen.getByText("Thanks for rating!")).toBeTruthy();
      expect((screen.getByRole("button", { name: "3" }) as HTMLButtonElement).disabled).toBe(true);
    });

    it("an unfinished job cannot be rated", () => {
      renderPage(<BookingCard booking={withSupplier()} />);
      expect(screen.queryByText("How was the service?")).toBeNull();
    });
  });

  describe("reporting a problem", () => {
    it("needs a few words, then sends them", async () => {
      renderPage(<BookingCard booking={withSupplier()} />);
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Report a problem" }));

      const send = screen.getByRole("button", { name: "Send" }) as HTMLButtonElement;
      expect(send.disabled).toBe(true);

      await user.type(screen.getByPlaceholderText("What went wrong?"), "Supplier never came");
      expect(send.disabled).toBe(false);
      await user.click(send);

      await waitFor(() =>
        expect(apiFetch).toHaveBeenCalledWith("/api/bookings/b1/report", {
          method: "POST",
          body: JSON.stringify({ message: "Supplier never came" }),
        }),
      );
    });
  });
});

/** The red confirm button inside the open dialog (the card has a button with the same words). */
function within_dialog(name: string): HTMLElement {
  const dialog = screen.getByRole("dialog");
  return Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === name)!;
}

describe("tracking a booking", () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 9, h, m);

  it("shows who accepted and when, step by step", () => {
    renderPage(
      <BookingCard booking={withSupplier({ status: "on_the_way", createdAt: at(9), acceptedAt: at(9, 5), departedAt: at(9, 40), supplierName: "Hari" })} now={Date.now()} />,
    );
    expect(screen.getByText("Accepted")).toBeTruthy(); // the step (the badge says "On the way")
    expect(screen.getByText("Hari")).toBeTruthy(); // who: on the supplier card
    expect(screen.getByText(/9 Oct, 09:05|9 Oct, 9:05/)).toBeTruthy();
    expect(screen.getAllByText("On the way")).toHaveLength(2); // the status badge and the step
    expect(screen.getByText("Arrived")).toBeTruthy(); // the next step, not done yet
  });

  it("while on the way: the live map, how far and about how long", () => {
    renderPage(
      <BookingCard
        booking={withSupplier({
          status: "on_the_way",
          departedAt: at(9, 40),
          location: { lat: 27.665, lng: 85.3667 },
          supplierLocation: { lat: 27.6786, lng: 85.3494, at: new Date() },
        })}
        now={Date.now()}
      />,
    );
    expect(screen.getByTestId("live-map").textContent).toBe("supplier on map");
    expect(screen.getByText(/About \d+ min away · 2\.\d km/)).toBeTruthy();
    expect(screen.getByText("Location updated just now")).toBeTruthy();
  });

  it("says when the supplier has arrived, or is running late", () => {
    const { unmount } = renderPage(<BookingCard booking={withSupplier({ status: "on_the_way", arrivedAt: at(10), supplierName: "Hari" })} now={Date.now()} />);
    expect(screen.getByText("Hari has arrived at your place.")).toBeTruthy();
    expect(screen.queryByTestId("live-map")).toBeNull(); // no need to track any more
    unmount();
    renderPage(<BookingCard booking={withSupplier({ lateByMinutes: 30 })} now={Date.now()} />);
    expect(screen.getByText("Running about 30 min late")).toBeTruthy();
  });

  it("marks a booking delayed when its time has passed and nobody is on the way", () => {
    const past = withSupplier({ scheduledFor: new Date(Date.now() - 4 * 3_600_000), scheduledEnd: new Date(Date.now() - 3_600_000) });
    renderPage(<BookingCard booking={past} now={Date.now()} />);
    expect(screen.getByText("Delayed: the booked time has passed")).toBeTruthy();
  });
});
