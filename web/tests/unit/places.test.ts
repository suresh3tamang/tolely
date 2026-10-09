import { describe, expect, it, vi } from "vitest";
import { createPlaceSearch, createRateLimiter, toPlace } from "@/server/places/places.service";

// Shaped like a real answer from Nominatim.
const balkot = {
  place_id: 123,
  lat: "27.66503",
  lon: "85.36670",
  name: "Balkot Chowk",
  display_name: "Balkot Chowk, Suryabinayak-02, Bhaktapur, Bagmati Province, 44800, Nepal",
};
const abroad = { place_id: 9, lat: "37.77", lon: "-122.4", name: "Balkot", display_name: "Balkot, California, USA" };

function reply(items: unknown, ok = true) {
  return vi.fn(async () => ({ ok, json: async () => items }) as Response);
}

function search(fetchImpl: ReturnType<typeof reply>, extra = {}) {
  let t = 0;
  return createPlaceSearch({ fetchImpl, now: () => t, sleep: async (ms) => void (t += ms), ...extra });
}

describe("toPlace", () => {
  it("uses the name as the label and the address as the detail", () => {
    expect(toPlace(balkot)).toEqual({
      id: "123",
      label: "Balkot Chowk",
      detail: "Suryabinayak-02 · Bhaktapur · Bagmati Province",
      lat: 27.66503,
      lng: 85.3667,
    });
  });

  it("ignores results without a usable position", () => {
    expect(toPlace({ lat: "x", lon: "1", display_name: "a" })).toBeNull();
  });
});

describe("place search", () => {
  it("asks Nominatim for Nepal, prefers the valley, and identifies itself", async () => {
    const fetchImpl = reply([balkot]);
    const places = await search(fetchImpl)("  Balkot   chowk ");
    expect(places[0].label).toBe("Balkot Chowk");

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.searchParams.get("q")).toBe("Balkot chowk");
    expect(url.searchParams.get("countrycodes")).toBe("np");
    expect(url.searchParams.get("viewbox")).toBeTruthy();
    expect((init.headers as Record<string, string>)["user-agent"]).toContain("Tolely");
  });

  it("drops places outside Nepal and duplicates", async () => {
    const places = await search(reply([balkot, abroad, { ...balkot, place_id: 124 }]))("balkot");
    expect(places).toHaveLength(1);
  });

  it("remembers answers so a repeated search does not call Nominatim again", async () => {
    const fetchImpl = reply([balkot]);
    const run = search(fetchImpl);
    await run("Balkot");
    await run("balkot ");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("keeps at least the minimum gap between calls to Nominatim", async () => {
    const stamps: number[] = [];
    let t = 0;
    const fetchImpl = vi.fn(async () => (stamps.push(t), { ok: true, json: async () => [] }) as unknown as Response);
    const run = createPlaceSearch({ fetchImpl, now: () => t, sleep: async (ms) => void (t += ms), minGapMs: 1100 });
    await Promise.all([run("one"), run("two"), run("three")]);
    expect(stamps[1] - stamps[0]).toBeGreaterThanOrEqual(1100);
    expect(stamps[2] - stamps[1]).toBeGreaterThanOrEqual(1100);
  });

  it("turns an upstream failure into a 502 and does not block later searches", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [balkot] });
    const run = search(fetchImpl as unknown as ReturnType<typeof reply>);
    await expect(run("balkot")).rejects.toMatchObject({ status: 502 });
    await expect(run("balkot")).resolves.toHaveLength(1);
  });

  it("turns a network error into a 502", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(search(fetchImpl as unknown as ReturnType<typeof reply>)("x y")).rejects.toMatchObject({ status: 502 });
  });
});

describe("rate limiter", () => {
  it("allows the limit per person per window, then recovers", () => {
    let t = 0;
    const allow = createRateLimiter({ limit: 2, windowMs: 1000, now: () => t });
    expect([allow("a"), allow("a"), allow("a")]).toEqual([true, true, false]);
    expect(allow("b")).toBe(true);
    t = 1500;
    expect(allow("a")).toBe(true);
  });
});

describe("other ways to write a spoken place name", () => {
  it("writes Nepali names in English letters", async () => {
    const { romanize } = await import("@/server/places/query-variants");
    expect(romanize("बालकोट")).toBe("balkot");
    expect(romanize("कोटेश्वर")).toBe("koteshwar");
    expect(romanize("ठिमी")).toBe("thimi");
    expect(romanize("गाम्चा")).toBe("gamcha");
  });

  it("tries in English letters, then without words like 'chowk'", async () => {
    const { queryVariants } = await import("@/server/places/query-variants");
    expect(queryVariants("बालकोट चोक")).toEqual(["balkot chowk", "बालकोट"]);
    expect(queryVariants("Balkot chowk")).toEqual(["Balkot"]);
    expect(queryVariants("Gamcha")).toEqual([]);
  });

  it("searches the other spellings when the first finds nothing", async () => {
    const asked: string[] = [];
    let t = 0;
    const fetchImpl = vi.fn(async (url: URL) => {
      const q = url.searchParams.get("q")!;
      asked.push(q);
      return { ok: true, json: async () => (q === "balkot chowk" ? [balkot] : []) } as unknown as Response;
    });
    const run = createPlaceSearch({ fetchImpl: fetchImpl as never, now: () => t, sleep: async (ms) => void (t += ms) });
    const places = await run("बालकोट चोक");
    expect(asked).toEqual(["बालकोट चोक", "balkot chowk"]);
    expect(places[0].label).toBe("Balkot Chowk");
  });
});
