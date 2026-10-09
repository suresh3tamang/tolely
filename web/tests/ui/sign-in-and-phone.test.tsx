// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FirebaseError } from "firebase/app";
import { linkWithPhoneNumber, signInWithPopup } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PhoneStep } from "@/app/book/phone-step";
import { SignInCard } from "@/app/book/sign-in-card";
import { renderPage } from "./helpers";

vi.mock("@/client/firebase", () => ({ apiFetch: vi.fn(), clientAuth: vi.fn(() => ({})), clientDb: vi.fn() }));
vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  RecaptchaVerifier: class {
    clear = vi.fn();
  },
  signInWithPopup: vi.fn(),
  linkWithPhoneNumber: vi.fn(),
}));

const fail = (code: string) => new FirebaseError(code, code);

describe("Google sign-in", () => {
  beforeEach(() => {
    vi.mocked(signInWithPopup).mockReset();
  });

  it("offers one clear button, and tells providers to use the app", () => {
    renderPage(<SignInCard />);
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeTruthy();
    expect(screen.getByText(/Providers use the Tolely app, not the website/)).toBeTruthy();
  });

  it("opens Google's sign-in window", async () => {
    vi.mocked(signInWithPopup).mockResolvedValue({} as never);
    renderPage(<SignInCard />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Continue with Google/ }));
    expect(signInWithPopup).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["auth/popup-blocked", /blocked the sign-in window/],
    ["auth/operation-not-allowed", /not available yet/],
    ["auth/network-request-failed", /Could not sign in/],
  ])("explains %s in plain words", async (code, message) => {
    vi.mocked(signInWithPopup).mockRejectedValue(fail(code));
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderPage(<SignInCard />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Continue with Google/ }));
    expect(await screen.findByText(message)).toBeTruthy();
  });

  it("says nothing when the person simply closes the window", async () => {
    vi.mocked(signInWithPopup).mockRejectedValue(fail("auth/popup-closed-by-user"));
    renderPage(<SignInCard />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Continue with Google/ }));
    await waitFor(() => expect((screen.getByRole("button", { name: /Continue with Google/ }) as HTMLButtonElement).disabled).toBe(false));
    expect(screen.queryByText(/Could not sign in/)).toBeNull();
  });

  it("is in Nepali for Nepali speakers", () => {
    renderPage(<SignInCard />, "ne");
    expect(screen.getByRole("button", { name: /Google बाट जारी राख्नुहोस्/ })).toBeTruthy();
  });
});

describe("phone verification", () => {
  const user = { getIdToken: vi.fn(async () => "fresh-token") } as never;
  const onDone = vi.fn();
  const confirm = vi.fn();

  beforeEach(() => {
    vi.mocked(linkWithPhoneNumber).mockReset().mockResolvedValue({ confirm } as never);
    confirm.mockReset().mockResolvedValue({});
    onDone.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  async function enterPhone(number: string) {
    const person = userEvent.setup();
    await person.type(screen.getByPlaceholderText("98XXXXXXXX"), number);
    await person.click(screen.getByRole("button", { name: "Send code" }));
    return person;
  }

  it("rejects a number that is not 10 digits, without calling Firebase", async () => {
    renderPage(<PhoneStep user={user} onDone={onDone} />);
    await enterPhone("98123");
    expect(await screen.findByText("Enter a 10-digit mobile number.")).toBeTruthy();
    expect(linkWithPhoneNumber).not.toHaveBeenCalled();
  });

  it("links a Nepal number (+977) and then asks for the code", async () => {
    renderPage(<PhoneStep user={user} onDone={onDone} />);
    await enterPhone("9800000001");

    await waitFor(() => expect(linkWithPhoneNumber).toHaveBeenCalledTimes(1));
    expect(vi.mocked(linkWithPhoneNumber).mock.calls[0][1]).toBe("+9779800000001");
    expect(await screen.findByText("Code sent to +977 9800000001")).toBeTruthy();
    expect(screen.getByLabelText("6-digit code")).toBeTruthy();
  });

  it("confirms the code, refreshes the login so it carries the number, then moves on", async () => {
    renderPage(<PhoneStep user={user} onDone={onDone} />);
    const person = await enterPhone("9800000001");

    await person.type(await screen.findByLabelText("6-digit code"), "111111");
    await person.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(confirm).toHaveBeenCalledWith("111111");
    expect((user as { getIdToken: ReturnType<typeof vi.fn> }).getIdToken).toHaveBeenCalledWith(true);
  });

  it("the Verify button waits for all 6 digits", async () => {
    renderPage(<PhoneStep user={user} onDone={onDone} />);
    const person = await enterPhone("9800000001");
    await person.type(await screen.findByLabelText("6-digit code"), "123");
    expect((screen.getByRole("button", { name: "Verify" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("a wrong code is explained, and the person can try again", async () => {
    confirm.mockRejectedValue(fail("auth/invalid-verification-code"));
    renderPage(<PhoneStep user={user} onDone={onDone} />);
    const person = await enterPhone("9800000001");
    await person.type(await screen.findByLabelText("6-digit code"), "000000");
    await person.click(screen.getByRole("button", { name: "Verify" }));

    expect(await screen.findByText("That code is not right. Please try again.")).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("a number that already belongs to another account (maybe made in the app) is explained", async () => {
    vi.mocked(linkWithPhoneNumber).mockRejectedValue(fail("auth/credential-already-in-use"));
    renderPage(<PhoneStep user={user} onDone={onDone} />);
    await enterPhone("9800000001");
    expect(await screen.findByText(/already belongs to another Tolely account/)).toBeTruthy();
  });

  it("too many attempts is explained", async () => {
    vi.mocked(linkWithPhoneNumber).mockRejectedValue(fail("auth/too-many-requests"));
    renderPage(<PhoneStep user={user} onDone={onDone} />);
    await enterPhone("9800000001");
    expect(await screen.findByText(/Too many tries/)).toBeTruthy();
  });

  it("the person can go back and change the number", async () => {
    renderPage(<PhoneStep user={user} onDone={onDone} />);
    const person = await enterPhone("9800000001");
    await person.click(await screen.findByRole("button", { name: "Change number" }));
    expect(screen.getByPlaceholderText("98XXXXXXXX")).toBeTruthy();
  });
});
