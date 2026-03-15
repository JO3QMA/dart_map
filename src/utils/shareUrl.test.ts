import { describe, it, expect } from "vitest";
import {
  buildResultSearchParams,
  parseResultFromSearch,
  type ResultSharePayload,
} from "./shareUrl";

const prefectureResult: ResultSharePayload = {
  result: {
    id: "13",
    type: "prefecture",
    name: "東京都",
    coordinate: { lat: 35.6894, lng: 139.6917 },
  },
  mode: "country",
};

const cityResult: ResultSharePayload = {
  result: {
    id: "13101",
    type: "city",
    name: "千代田区",
    coordinate: { lat: 35.694, lng: 139.753 },
    parentId: "13",
  },
  mode: "prefecture",
  parentName: "東京都",
  selectedPrefecture: "13",
  selectedCity: null,
};

const townResult: ResultSharePayload = {
  result: {
    id: "13101-001",
    type: "town",
    name: "丸の内",
    coordinate: { lat: 35.6812, lng: 139.7639 },
    parentId: "DC-13-13101",
  },
  mode: "city",
  parentName: "千代田区",
  selectedPrefecture: "13",
  selectedCity: "13101",
};

describe("buildResultSearchParams", () => {
  it("includes required keys for prefecture result", () => {
    const params = buildResultSearchParams(prefectureResult);
    expect(params.get("id")).toBe("13");
    expect(params.get("type")).toBe("prefecture");
    expect(params.get("name")).toBe("東京都");
    expect(params.get("lat")).toBe("35.6894");
    expect(params.get("lng")).toBe("139.6917");
    expect(params.get("mode")).toBe("country");
  });

  it("includes optional parent, prefecture, city for city-level result", () => {
    const params = buildResultSearchParams(cityResult);
    expect(params.get("parentId")).toBe("13");
    expect(params.get("parent")).toBe("東京都");
    expect(params.get("prefecture")).toBe("13");
    expect(params.get("city")).toBeNull();
  });

  it("includes all optional keys for town result", () => {
    const params = buildResultSearchParams(townResult);
    expect(params.get("parentId")).toBe("DC-13-13101");
    expect(params.get("parent")).toBe("千代田区");
    expect(params.get("prefecture")).toBe("13");
    expect(params.get("city")).toBe("13101");
  });
});

describe("parseResultFromSearch", () => {
  it("restores result and mode from valid query string", () => {
    const search =
      "?id=13&type=prefecture&name=%E6%9D%B1%E4%BA%AC%E9%83%BD&lat=35.6894&lng=139.6917&mode=country";
    const payload = parseResultFromSearch(search);
    expect(payload).not.toBeNull();
    expect(payload!.result.id).toBe("13");
    expect(payload!.result.type).toBe("prefecture");
    expect(payload!.result.name).toBe("東京都");
    expect(payload!.result.coordinate.lat).toBe(35.6894);
    expect(payload!.result.coordinate.lng).toBe(139.6917);
    expect(payload!.mode).toBe("country");
  });

  it("returns null when required param is missing", () => {
    expect(
      parseResultFromSearch(
        "?id=13&type=prefecture&lat=35.68&lng=139.69&mode=country",
      ),
    ).toBeNull();
    expect(
      parseResultFromSearch(
        "?id=13&type=prefecture&name=Tokyo&lng=139.69&mode=country",
      ),
    ).toBeNull();
    expect(
      parseResultFromSearch(
        "?id=13&type=prefecture&name=Tokyo&lat=35.68&mode=country",
      ),
    ).toBeNull();
  });

  it("returns null when lat or lng is not a finite number", () => {
    expect(
      parseResultFromSearch(
        "?id=13&type=prefecture&name=Tokyo&lat=abc&lng=139.69&mode=country",
      ),
    ).toBeNull();
    expect(
      parseResultFromSearch(
        "?id=13&type=prefecture&name=Tokyo&lat=35.68&lng=nan&mode=country",
      ),
    ).toBeNull();
    expect(
      parseResultFromSearch(
        "?id=13&type=prefecture&name=Tokyo&lat=35.68&lng=139.69&mode=country",
      ),
    ).not.toBeNull();
  });

  it("returns null when type is not a valid RegionLevel", () => {
    expect(
      parseResultFromSearch(
        "?id=13&type=invalid&name=Tokyo&lat=35.68&lng=139.69&mode=country",
      ),
    ).toBeNull();
  });

  it("returns null when mode is not a valid GameMode", () => {
    expect(
      parseResultFromSearch(
        "?id=13&type=prefecture&name=Tokyo&lat=35.68&lng=139.69&mode=invalid",
      ),
    ).toBeNull();
  });

  it("round-trips: buildResultSearchParams then parseResultFromSearch matches original payload", () => {
    for (const payload of [prefectureResult, cityResult, townResult]) {
      const params = buildResultSearchParams(payload);
      const search = `?${params.toString()}`;
      const parsed = parseResultFromSearch(search);
      expect(parsed).not.toBeNull();
      expect(parsed!.result.id).toBe(payload.result.id);
      expect(parsed!.result.type).toBe(payload.result.type);
      expect(parsed!.result.name).toBe(payload.result.name);
      expect(parsed!.result.coordinate.lat).toBe(payload.result.coordinate.lat);
      expect(parsed!.result.coordinate.lng).toBe(payload.result.coordinate.lng);
      expect(parsed!.mode).toBe(payload.mode);
      expect(parsed!.parentName).toBe(payload.parentName ?? undefined);
      expect(parsed!.selectedPrefecture ?? null).toBe(
        payload.selectedPrefecture ?? null,
      );
      expect(parsed!.selectedCity ?? null).toBe(payload.selectedCity ?? null);
    }
  });
});
