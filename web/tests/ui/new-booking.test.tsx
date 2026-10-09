// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/client/firebase";
import { NewBooking } from "@/app/book/new-booking";
import { renderPage } from "./helpers";

vi.mock("@/client/firebase", () => ({ apiFetch: vi.fn(), clientAuth: vi.fn(), clientDb: vi.fn() }));

// The real map needs a browser; this stand-in lets a test "place the pin" with a button.
vi.mock("@/app/book/location-picker-lazy", () => ({
  LocationPicker: ({ value, onChange }: { value: { lat: number; lng: number } | null; onChange: (p: { lat: number; lng: number }) => void }) => (
    <div data-testid="map">
      <button type="button" onClick={() => onChange({ lat: 27.7172, lng: 85.324 })}>Pin Kathmandu</button>
      <button type="button" onClick={() => onChange({ lat: 37.77, lng: -122.4 })}>Pin San Francisco</button>
      {value && <span>pinned at {value.lat},{value.lng}</span>}
    </div>
  ),
}));

const services = [
  {
    key: "tanker",
    nameEn: "Water Tanker",
    nameNe: "पानी ट्याङ्कर",
    icon: "water_drop",
    active: true,
    options: [
      { id: "6000L", labelEn: "6,000 Liters", labelNe: "६,००० लिटर", price: 2500 },
      { id: "8000L", labelEn: "8,000 Liters", labelNe: "८,००० लिटर", price: 3200 },
    ],
  },
  {
    key: "plumber",
    nameEn: "Plumber",
    nameNe: "प्लम्बर",
    icon: "plumbing",
    active: true,
    options: [{ id: "visit", labelEn: "Visit", labelNe: "भ्रमण", price: 500 }],
  },
];

const onBooked = vi.fn();

function show(language: "en" | "ne" = "en") {
  renderPage(<NewBooking
      defaultAddress="Balkot, Bhaktapur"
      defaultLandmark="Near the temple"
      defaultName="Sita Tamang"
      defaultPhone="+9779800000001"
      onBooked={onBooked}
    />, language);
}

async function pin(user: ReturnType<typeof userEvent.setup>, place = "Pin Kathmandu") {
  await user.click(await screen.findByRole("button", { name: place }));
}

/** Tomorrow, 12 PM – 3 PM: always available, whatever time the test runs. */
async function pickTime(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Tomorrow" }));
  await user.click(screen.getByRole("button", { name: "12 PM – 3 PM" }));
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  onBooked.mockReset();
  vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ services }) })));
});

describe("booking form", () => {
  it("lists the services with their cheapest price", async () => {
    show();
    expect(await screen.findByText("Water Tanker")).toBeTruthy();
    expect(screen.getByText("From Rs 2,500")).toBeTruthy();
    expect(screen.getByText("From Rs 500")).toBeTruthy();
  });

  it("shows nothing to pay until a service is chosen, then the first option's price", async () => {
    show();
    const user = userEvent.setup();
    await screen.findByText("Water Tanker");
    expect(screen.queryByText("Confirm booking")).toBeNull();

    await user.click(screen.getByText("Water Tanker"));
    expect(screen.getByText("Total")).toBeTruthy();
    expect(screen.getAllByText("Rs 2,500").length).toBeGreaterThan(0);
  });

  it("the total follows the chosen size", async () => {
    show();
    const user = userEvent.setup();
    await user.click(await screen.findByText("Water Tanker"));
    await user.click(screen.getByLabelText(/8,000 Liters/));

    const total = screen.getByText("Total").nextElementSibling!;
    expect(total.textContent).toBe("Rs 3,200");
  });

  it("sends the booking as the person filled it in, with no price", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ id: "b1", price: 3200 });
    show();
    const user = userEvent.setup();
    await user.click(await screen.findByText("Water Tanker"));
    await user.click(screen.getByLabelText(/8,000 Liters/));
    await user.click(screen.getByText("eSewa / Khalti QR"));
    await pin(user);
    await pickTime(user);
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    const [path, init] = vi.mocked(apiFetch).mock.calls[0];
    expect(path).toBe("/api/bookings");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(init!.body as string);
    expect(body).toMatchObject({
      serviceKey: "tanker",
      optionId: "8000L",
      address: "Balkot, Bhaktapur",
      landmark: "Near the temple",
      paymentMethod: "qr",
      location: { lat: 27.7172, lng: 85.324 }, // the pin from the map
    });
    expect("price" in body).toBe(false); // the server decides the price
    // Tomorrow 12:00 to 15:00, as proper UTC timestamps.
    const start = new Date(body.scheduledFor);
    const end = new Date(body.scheduledEnd);
    expect(start.getTime()).toBeGreaterThan(Date.now());
    expect([start.getHours(), end.getHours()]).toEqual([12, 15]);
    expect(body.scheduledFor).toMatch(/Z$/);
    // The supplier is told whom to call: the account holder's details unless changed.
    expect(body).toMatchObject({ contactName: "Sita Tamang", contactPhone: "+9779800000001" });
    await waitFor(() => expect(onBooked).toHaveBeenCalled());
  });

  it("sends another contact person and number when the customer changes them", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ id: "b1", price: 500 });
    show();
    const user = userEvent.setup();
    await user.click(await screen.findByText("Plumber"));
    await pin(user);
    await pickTime(user);
    await user.clear(screen.getByLabelText("Contact person"));
    await user.type(screen.getByLabelText("Contact person"), "Hari (brother)");
    await user.clear(screen.getByLabelText("Contact phone"));
    await user.type(screen.getByLabelText("Contact phone"), "9811122233");
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(JSON.parse(vi.mocked(apiFetch).mock.calls[0][1]!.body as string)).toMatchObject({
      contactName: "Hari (brother)",
      contactPhone: "+9779811122233",
    });
  });

  it("cannot be confirmed without a time, or with a bad phone number", async () => {
    show();
    const user = userEvent.setup();
    await user.click(await screen.findByText("Plumber"));
    await pin(user);
    const confirm = () => screen.getByRole("button", { name: "Confirm booking" }) as HTMLButtonElement;

    expect(confirm().disabled).toBe(true); // no time chosen yet
    expect(screen.getByText("Choose a day and a time.")).toBeTruthy();
    await pickTime(user);
    expect(confirm().disabled).toBe(false);

    await user.clear(screen.getByLabelText("Contact phone"));
    await user.type(screen.getByLabelText("Contact phone"), "98");
    expect(confirm().disabled).toBe(true);
    expect(screen.getByText("Enter a phone number with 8 to 10 digits.")).toBeTruthy();
  });

  it("offers the windows of the chosen day", async () => {
    show();
    const user = userEvent.setup();
    await user.click(await screen.findByText("Plumber"));
    await user.click(screen.getByRole("button", { name: "Tomorrow" }));
    for (const label of ["6 AM – 9 AM", "9 AM – 12 PM", "12 PM – 3 PM", "3 PM – 6 PM", "6 PM – 9 PM"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    expect(screen.queryByRole("button", { name: "As soon as possible" })).toBeNull(); // only today
  });

  it("cannot be confirmed without an address", async () => {
    show();
    const user = userEvent.setup();
    await user.click(await screen.findByText("Plumber"));
    await user.clear(screen.getByDisplayValue("Balkot, Bhaktapur"));

    expect((screen.getByRole("button", { name: "Confirm booking" }) as HTMLButtonElement).disabled).toBe(true);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("shows the server's reason when a booking is refused, and stays open", async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error("Please verify your phone number before booking."));
    show();
    const user = userEvent.setup();
    await user.click(await screen.findByText("Plumber"));
    await pin(user);
    await pickTime(user);
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    expect(await screen.findByText("Please verify your phone number before booking.")).toBeTruthy();
    expect(onBooked).not.toHaveBeenCalled();
  });

  it("is in Nepali by default for Nepali speakers", async () => {
    show("ne");
    expect(await screen.findByText("पानी ट्याङ्कर")).toBeTruthy();
    expect(screen.getByText("तपाईंलाई के चाहियो?")).toBeTruthy();
    expect(screen.getByText("Rs 2,500 देखि")).toBeTruthy();
  });

  describe("choosing the location on the map", () => {
    it("is the first thing in the form, before the service", async () => {
      show();
      const map = await screen.findByTestId("map");
      const firstService = await screen.findByText("Water Tanker");
      // DOCUMENT_POSITION_FOLLOWING: the service comes after the map.
      expect(map.compareDocumentPosition(firstService) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.getByText("Where do you need the service?")).toBeTruthy();
    });

    it("the booking cannot be confirmed until a pin is placed, and says why", async () => {
      show();
      const user = userEvent.setup();
      await user.click(await screen.findByText("Plumber"));

      expect((screen.getByRole("button", { name: "Confirm booking" }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByText("Place the pin on the map to continue.")).toBeTruthy();

      await pin(user);
      await pickTime(user);
      expect((screen.getByRole("button", { name: "Confirm booking" }) as HTMLButtonElement).disabled).toBe(false);
      expect(screen.queryByText("Place the pin on the map to continue.")).toBeNull();
    });

    it("the pin can be moved to another place before booking", async () => {
      vi.mocked(apiFetch).mockResolvedValue({ id: "b1", price: 500 });
      show();
      const user = userEvent.setup();
      await user.click(await screen.findByText("Plumber"));
      await pin(user); // first place
      expect(screen.getByText(/pinned at 27.7172,85.324/)).toBeTruthy();

      // (the map reports a new place when the pin is dragged or the map is tapped)
      await pin(user, "Pin Kathmandu");
      await pickTime(user);
      await user.click(screen.getByRole("button", { name: "Confirm booking" }));
      await waitFor(() => expect(apiFetch).toHaveBeenCalled());
      expect(JSON.parse(vi.mocked(apiFetch).mock.calls[0][1]!.body as string).location).toEqual({ lat: 27.7172, lng: 85.324 });
    });

    it("a place outside Nepal is refused with a clear message", async () => {
      show();
      const user = userEvent.setup();
      await user.click(await screen.findByText("Plumber"));
      await pin(user, "Pin San Francisco");

      expect(screen.getByText("Please choose a place in Nepal.")).toBeTruthy();
      expect((screen.getByRole("button", { name: "Confirm booking" }) as HTMLButtonElement).disabled).toBe(true);
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it("the map texts are in Nepali for Nepali speakers", async () => {
      show("ne");
      expect(await screen.findByText("सेवा कहाँ चाहिएको हो?")).toBeTruthy();
    });
  });

  it("says so when there are no services", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ services: [] }) })));
    show();
    expect(await screen.findByText("No services are available right now.")).toBeTruthy();
  });
});
