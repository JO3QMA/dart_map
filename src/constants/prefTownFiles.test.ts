import { describe, it, expect } from "vitest";
import {
  getTownSlugFromPrefCode,
  PREF_CODE_TO_TOWN_SLUG,
} from "./prefTownFiles";

describe("getTownSlugFromPrefCode", () => {
  it("returns slug for a known prefecture code", () => {
    expect(getTownSlugFromPrefCode("13")).toBe("tokyo");
    expect(getTownSlugFromPrefCode("01")).toBe("hokkaido");
    expect(getTownSlugFromPrefCode("47")).toBe("okinawa");
  });

  it("returns undefined for unknown prefecture code", () => {
    expect(getTownSlugFromPrefCode("99")).toBeUndefined();
    expect(getTownSlugFromPrefCode("")).toBeUndefined();
  });

  it("covers all entries in PREF_CODE_TO_TOWN_SLUG", () => {
    for (const [code, slug] of Object.entries(PREF_CODE_TO_TOWN_SLUG)) {
      expect(getTownSlugFromPrefCode(code)).toBe(slug);
    }
  });
});
