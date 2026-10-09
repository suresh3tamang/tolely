// @vitest-environment jsdom
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/client/firebase";
import { PlaceSearch } from "@/app/book/place-search";
import { renderPage } from "./helpers";

vi.mock("@/client/firebase", () => ({ apiFetch: vi.fn(), clientAuth: vi.fn(), clientDb: vi.fn() }));

const balkot = { id: "1", label: "Balkot Chowk", detail: "Suryabinayak-02 · Bhaktapur", lat: 27.665, lng: 85.3667 };
const balkotBus = { id: "2", label: "Balkot", detail: "Bhaktapur", lat: 27.661, lng: 85.3697 };

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
});

describe("PlaceSearch", () => {
  it("picks the first match and offers the others", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ results: [balkot, balkotBus] });
    const onPick = vi.fn();
    renderPage(<PlaceSearch onPick={onPick} />);

    await userEvent.type(screen.getByRole("searchbox"), "Balkot chowk");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(onPick).toHaveBeenCalledWith(balkot));
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toBe("/api/places/search?q=Balkot%20chowk&lang=en");

    await userEvent.click(await screen.findByRole("button", { name: /^BalkotBhaktapur$/ }));
    expect(onPick).toHaveBeenLastCalledWith(balkotBus);
  });

  it("searches on Enter without submitting the booking form around it", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ results: [balkot] });
    const onPick = vi.fn();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    renderPage(
      <form onSubmit={onSubmit}>
        <PlaceSearch onPick={onPick} />
      </form>,
    );
    await userEvent.type(screen.getByRole("searchbox"), "Balkot{Enter}");
    await waitFor(() => expect(onPick).toHaveBeenCalled());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not search for fewer than 2 letters", async () => {
    renderPage(<PlaceSearch onPick={vi.fn()} />);
    await userEvent.type(screen.getByRole("searchbox"), "B{Enter}");
    expect(apiFetch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Search" })).toHaveProperty("disabled", true);
  });

  it("says so when nothing is found", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ results: [] });
    renderPage(<PlaceSearch onPick={vi.fn()} />);
    await userEvent.type(screen.getByRole("searchbox"), "zzzz{Enter}");
    expect(await screen.findByText(/No place found/)).toBeTruthy();
  });

  it("says so when the search fails", async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error("502"));
    renderPage(<PlaceSearch onPick={vi.fn()} />);
    await userEvent.type(screen.getByRole("searchbox"), "balkot{Enter}");
    expect(await screen.findByText(/Search is not working/)).toBeTruthy();
  });

  it("suggests places after 3 letters without moving the map", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ results: [balkot, balkotBus] });
    const onPick = vi.fn();
    renderPage(<PlaceSearch onPick={onPick} />);

    await userEvent.type(screen.getByRole("searchbox"), "Ba");
    await new Promise((r) => setTimeout(r, 750));
    expect(apiFetch).not.toHaveBeenCalled();

    await userEvent.type(screen.getByRole("searchbox"), "l");
    expect(await screen.findByRole("button", { name: /^Balkot ChowkSuryabinayak/ }, { timeout: 2000 })).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("searches a place that was said out loud", async () => {
    // A pretend browser speech recognition that "hears" Balkot chowk.
    let instance: { lang: string; onresult: (e: unknown) => void; onend: () => void } | null = null;
    class FakeRecognition {
      lang = "";
      interimResults = false;
      continuous = false;
      onresult: ((e: unknown) => void) | null = null;
      onerror = null;
      onend: (() => void) | null = null;
      constructor() {
        instance = this as never;
      }
      start() {}
      stop() {}
    }
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
    vi.mocked(apiFetch).mockResolvedValue({ results: [balkot] });
    const onPick = vi.fn();
    renderPage(<PlaceSearch onPick={onPick} />, "ne");

    await userEvent.click(await screen.findByRole("button", { name: "ठाउँको नाम बोल्नुहोस्" }));
    expect(instance!.lang).toBe("ne-NP");
    const result = Object.assign([{ transcript: "बालकोट चोक" }], { isFinal: true });
    act(() => instance!.onresult({ results: [result] }));
    act(() => instance!.onend());

    await waitFor(() => expect(onPick).toHaveBeenCalledWith(balkot));
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toBe(`/api/places/search?q=${encodeURIComponent("बालकोट चोक")}&lang=ne`);
    vi.unstubAllGlobals();
  });

  it("'mero ghar' or 'yahi' uses the current location instead of searching", async () => {
    const onHere = vi.fn();
    renderPage(<PlaceSearch onPick={vi.fn()} onHere={onHere} />);
    await userEvent.type(screen.getByRole("searchbox"), "aile basirako gharma{Enter}");
    expect(onHere).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 700)); // no suggestions either
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
