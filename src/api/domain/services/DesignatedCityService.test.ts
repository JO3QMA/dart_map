import { describe, it, expect } from "vitest";
import type { Region } from "../models/Region";
import {
  isDesignatedCityId,
  getWardFilter,
  mergeCitiesWithDesignated,
} from "./DesignatedCityService";

function region(id: string, name: string): Region {
  return {
    id,
    type: "city",
    name,
    coordinate: { lat: 0, lng: 0 },
  };
}

describe("isDesignatedCityId", () => {
  it("returns true for IDs starting with DC-", () => {
    expect(isDesignatedCityId("DC-13-大阪市")).toBe(true);
  });

  it("returns false for regular city IDs", () => {
    expect(isDesignatedCityId("13101")).toBe(false);
    expect(isDesignatedCityId("")).toBe(false);
  });
});

describe("getWardFilter", () => {
  it("returns city name for a valid designated city ID", () => {
    expect(getWardFilter("DC-27-大阪市")).toBe("大阪市");
  });

  it("returns null for non-designated city IDs", () => {
    expect(getWardFilter("13101")).toBeNull();
  });

  it("returns null when city name is not in the designated list", () => {
    expect(getWardFilter("DC-13-東京都")).toBeNull();
  });
});

describe("mergeCitiesWithDesignated", () => {
  it("returns cities unchanged when designated list is empty", () => {
    const cities = [region("1", "札幌市"), region("2", "函館市")];
    expect(mergeCitiesWithDesignated(cities, [])).toEqual(cities);
  });

  it("removes wards and appends designated city records sorted by name", () => {
    const cities = [
      region("27102", "大阪市北区"),
      region("27103", "大阪市中央区"),
      region("27201", "堺市"),
    ];
    const designated = [region("DC-27-大阪市", "大阪市")];

    const merged = mergeCitiesWithDesignated(cities, designated);

    expect(merged).toHaveLength(2);
    expect(merged.map((r) => r.name)).toEqual(["堺市", "大阪市"]);
    expect(merged.find((r) => r.id === "DC-27-大阪市")).toBeDefined();
    expect(merged.find((r) => r.id === "27102")).toBeUndefined();
  });
});
