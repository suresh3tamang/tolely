// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookApp } from "@/app/book/book-app";
import { apiFetch } from "@/client/firebase";
import { useAuthUser } from "@/client/use-auth-user";
import { renderPage } from "./helpers";

vi.mock("@/client/firebase", () => ({ apiFetch: vi.fn(), clientAuth: vi.fn(() => ({})), clientDb: vi.fn() }));
vi.mock("@/client/use-auth-user", () => ({ useAuthUser: vi.fn() }));
vi.mock("firebase/auth", () => ({ signOut: vi.fn() }));
// The step screens have their own tests; here we only care which one is shown.
vi.mock("@/app/book/sign-in-card", () => ({ SignInCard: () => <div>STEP: sign in with Google</div> }));
vi.mock("@/app/book/phone-step", () => ({ PhoneStep: () => <div>STEP: verify phone</div> }));
vi.mock("@/app/book/profile-step", () => ({ ProfileStep: () => <div>STEP: profile</div> }));
vi.mock("@/app/book/new-booking", () => ({ NewBooking: () => <div>STEP: book a service</div> }));
vi.mock("@/app/book/my-bookings", () => ({ MyBookings: () => <div>STEP: my bookings</div> }));

const person = (phoneNumber: string | null = "+9779800000001") =>
  ({ uid: "u1", phoneNumber, displayName: "Suresh Tamang" }) as unknown as User;

const session = (user: Record<string, unknown> | null, supplier: unknown = null) =>
  vi.mocked(apiFetch).mockResolvedValue({ user, supplier });

const profile = { role: "customer", name: "Suresh Tamang", address: "Balkot", landmark: "" };

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  vi.mocked(useAuthUser).mockReset();
});

describe("which screen a person sees on the website", () => {
  it("someone signed out is asked to sign in with Google", async () => {
    vi.mocked(useAuthUser).mockReturnValue(null);
    renderPage(<BookApp />);
    expect(await screen.findByText("STEP: sign in with Google")).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("a signed-in person without a verified phone verifies it first", async () => {
    vi.mocked(useAuthUser).mockReturnValue(person(null));
    session(null);
    renderPage(<BookApp />);
    expect(await screen.findByText("STEP: verify phone")).toBeTruthy();
  });

  it("then fills in their profile", async () => {
    vi.mocked(useAuthUser).mockReturnValue(person());
    session(null);
    renderPage(<BookApp />);
    expect(await screen.findByText("STEP: profile")).toBeTruthy();
  });

  it("a complete customer lands on the booking form with a greeting", async () => {
    vi.mocked(useAuthUser).mockReturnValue(person());
    session(profile);
    renderPage(<BookApp />);

    expect(await screen.findByText("STEP: book a service")).toBeTruthy();
    expect(screen.getByText("Namaste, Suresh")).toBeTruthy();
  });

  it("can switch between booking and My bookings", async () => {
    vi.mocked(useAuthUser).mockReturnValue(person());
    session(profile);
    renderPage(<BookApp />);
    await screen.findByText("STEP: book a service");

    await userEvent.setup().click(screen.getByRole("button", { name: "My bookings" }));
    expect(screen.getByText("STEP: my bookings")).toBeTruthy();
  });

  describe("service providers use only the app", () => {
    it("a provider who opens the website is sent to the app, and cannot book", async () => {
      vi.mocked(useAuthUser).mockReturnValue(person());
      session({ role: "supplier", name: "Hari" }, { verified: true });
      renderPage(<BookApp />);

      expect(await screen.findByText("Service providers use the Tolely app")).toBeTruthy();
      expect(screen.getByText(/sign in with your phone number to see and accept jobs/)).toBeTruthy();
      expect(screen.queryByText("STEP: book a service")).toBeNull();
      expect(screen.queryByText("STEP: verify phone")).toBeNull();
    });

    it("the provider message is in Nepali for Nepali speakers", async () => {
      vi.mocked(useAuthUser).mockReturnValue(person());
      session({ role: "supplier", name: "Hari" });
      renderPage(<BookApp />, "ne");
      expect(await screen.findByText("सेवा दिनेहरूले टोलेली एप प्रयोग गर्छन्")).toBeTruthy();
    });

    it("an admin is pointed to the admin console", async () => {
      vi.mocked(useAuthUser).mockReturnValue(person(null));
      session({ role: "admin", name: "Admin" });
      renderPage(<BookApp />);
      expect(await screen.findByText("This is an admin account")).toBeTruthy();
      expect(screen.getByRole("link", { name: "Open admin console" }).getAttribute("href")).toBe("/admin");
    });
  });

  it("a failed load can be retried", async () => {
    vi.mocked(useAuthUser).mockReturnValue(person());
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("Server error"));
    session(profile);
    // first call fails, second succeeds
    vi.mocked(apiFetch).mockReset().mockRejectedValueOnce(new Error("Server error")).mockResolvedValue({ user: profile, supplier: null });
    renderPage(<BookApp />);

    expect(await screen.findByText("Server error")).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("STEP: book a service")).toBeTruthy();
  });
});
