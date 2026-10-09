// @vitest-environment jsdom
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { onSnapshot } from "firebase/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/client/firebase";
import { NotificationBell } from "@/app/book/notification-bell";
import { renderPage } from "./helpers";

vi.mock("@/client/firebase", () => ({ apiFetch: vi.fn(async () => ({ ok: true })), clientAuth: vi.fn(), clientDb: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
}));

type Doc = { id: string; data: () => Record<string, unknown> };
const note = (id: string, seen: boolean, titleEn = "On the way"): Doc => ({
  id,
  data: () => ({ type: "on_the_way", bookingId: "b1", titleEn, titleNe: "बाटोमा छ", bodyEn: "Hari is on the way.", bodyNe: "...", seen }),
});

/** Feeds the bell what the database would send. */
let push: (docs: Doc[], added?: Doc[]) => void;

beforeEach(() => {
  vi.mocked(apiFetch).mockClear();
  vi.mocked(onSnapshot).mockImplementation(((_q: unknown, next: (snap: unknown) => void) => {
    push = (docs, added = []) => next({ docs, docChanges: () => added.map((doc) => ({ type: "added", doc })) });
    return () => undefined;
  }) as never);
});

describe("notification bell", () => {
  it("counts the unseen ones, shows them in the tab title, and opening marks them seen", async () => {
    const onOpenBooking = vi.fn();
    renderPage(<NotificationBell uid="u1" onOpenBooking={onOpenBooking} />);
    act(() => push([note("n2", false), note("n1", true, "Booking accepted")]));

    const bell = screen.getByRole("button", { name: "Notifications (1)" });
    expect(bell.textContent).toContain("1");
    expect(document.title).toBe("(1) On the way · Tolely");

    await userEvent.click(bell);
    expect(screen.getByText("Booking accepted")).toBeTruthy();
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/api/me/notifications/seen", expect.objectContaining({ method: "POST" })));
    expect(JSON.parse(vi.mocked(apiFetch).mock.calls[0][1]!.body as string)).toEqual({ ids: ["n2"] });

    // The server marks it seen; the database sends the update and the count goes away.
    act(() => push([note("n2", true), note("n1", true, "Booking accepted")]));
    expect(screen.getByRole("button", { name: "Notifications" })).toBeTruthy();
    expect(document.title).toBe("Book a service · Tolely");

    await userEvent.click(screen.getByText("On the way"));
    expect(onOpenBooking).toHaveBeenCalled();
  });

  it("shows a browser notification for a new update while the tab is in the background", async () => {
    const shown: { title: string; body?: string }[] = [];
    class FakeNotification {
      static permission = "granted";
      onclick: (() => void) | null = null;
      constructor(title: string, options: { body?: string }) {
        shown.push({ title, body: options.body });
      }
      close() {}
    }
    vi.stubGlobal("Notification", FakeNotification);
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });

    renderPage(<NotificationBell uid="u1" onOpenBooking={vi.fn()} />);
    act(() => push([note("n1", true, "Booking accepted")])); // already there when the page opened: no pop-up
    act(() => push([note("n2", false), note("n1", true)], [note("n2", false)]));

    expect(shown).toEqual([{ title: "On the way", body: "Hari is on the way." }]);
    vi.unstubAllGlobals();
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
  });
});
