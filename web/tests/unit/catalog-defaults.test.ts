import { describe, expect, it } from "vitest";
import { DEFAULT_SERVICES, SERVICE_ICONS } from "@/shared/services";

// Guards the built-in catalog, so adding a service can't ship a typo.
describe("default service catalog", () => {
  it("has unique service keys", () => {
    const keys = DEFAULT_SERVICES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has unique option ids and sensible prices inside each service", () => {
    for (const service of DEFAULT_SERVICES) {
      const ids = service.options.map((o) => o.id);
      expect(new Set(ids).size, service.key).toBe(ids.length);
      expect(service.options.length, service.key).toBeGreaterThan(0);
      for (const option of service.options) {
        expect(Number.isInteger(option.price), `${service.key}/${option.id}`).toBe(true);
        expect(option.price, `${service.key}/${option.id}`).toBeGreaterThan(0);
      }
    }
  });

  it("names every service in English and Nepali", () => {
    for (const s of DEFAULT_SERVICES) {
      expect(s.nameEn.trim(), s.key).not.toBe("");
      expect(s.nameNe.trim(), s.key).not.toBe("");
      for (const o of s.options) {
        expect(o.labelEn.trim(), `${s.key}/${o.id}`).not.toBe("");
        expect(o.labelNe.trim(), `${s.key}/${o.id}`).not.toBe("");
      }
    }
  });

  it("only uses icons the mobile app can draw", () => {
    for (const s of DEFAULT_SERVICES) expect(SERVICE_ICONS, s.key).toContain(s.icon);
  });
});
