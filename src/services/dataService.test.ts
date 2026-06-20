import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Region } from "../types";
import {
  fetchRegions,
  fetchRandomTarget,
  getNextMode,
  getGoogleMapsUrl,
} from "./dataService";

const prefecture: Region = {
  id: "13",
  type: "prefecture",
  name: "東京都",
  coordinate: { lat: 35.68, lng: 139.69 },
};

describe("fetchRegions", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([prefecture]),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches prefecture list", async () => {
    const result = await fetchRegions("prefecture");

    expect(fetch).toHaveBeenCalledWith("/api/regions?type=prefecture");
    expect(result).toEqual([prefecture]);
  });

  it("throws when city level is requested without parentId", async () => {
    await expect(fetchRegions("city")).rejects.toThrow(
      "parentId is required when fetching city level regions",
    );
  });

  it("includes parent_id and merge_designated query params for cities", async () => {
    await fetchRegions("city", "13", true);

    expect(fetch).toHaveBeenCalledWith(
      "/api/regions?type=city&parent_id=13&merge_designated=true",
    );
  });

  it("fetches city level regions without merge flag", async () => {
    await fetchRegions("city", "13", false);

    expect(fetch).toHaveBeenCalledWith("/api/regions?type=city&parent_id=13");
  });

  it("uses fallback error message when API response has no error field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.reject(new Error("invalid json")),
      }),
    );

    await expect(fetchRegions("prefecture")).rejects.toThrow(
      "Failed to fetch regions: 503",
    );
  });

  it("throws with API error message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "bad request" }),
      }),
    );

    await expect(fetchRegions("prefecture")).rejects.toThrow("bad request");
  });
});

describe("fetchRandomTarget", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(prefecture),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches a random target for country mode", async () => {
    const result = await fetchRandomTarget("country");

    expect(fetch).toHaveBeenCalledWith("/api/draw?mode=country");
    expect(result).toEqual(prefecture);
  });

  it("throws a not-found message on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
      }),
    );

    await expect(fetchRandomTarget("country")).rejects.toThrow(
      "No region found for the given criteria",
    );
  });

  it("includes parent_id and merge_designated for draw requests", async () => {
    await fetchRandomTarget("prefecture", "13", true);

    expect(fetch).toHaveBeenCalledWith(
      "/api/draw?mode=prefecture&parent_id=13&merge_designated=true",
    );
  });

  it("uses fallback draw error message when API response has no error field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.reject(new Error("invalid json")),
      }),
    );

    await expect(fetchRandomTarget("country")).rejects.toThrow(
      "Failed to draw: 503",
    );
  });

  it("throws with API error message on other failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "server error" }),
      }),
    );

    await expect(fetchRandomTarget("country")).rejects.toThrow("server error");
  });
});

describe("getNextMode", () => {
  it("advances country to prefecture and prefecture to city", () => {
    expect(getNextMode("country")).toBe("prefecture");
    expect(getNextMode("prefecture")).toBe("city");
    expect(getNextMode("city")).toBeNull();
  });
});

describe("getGoogleMapsUrl", () => {
  it("builds a search URL from region name", () => {
    const url = getGoogleMapsUrl(prefecture);
    expect(url).toBe(
      "https://www.google.com/maps/search/?api=1&query=%E6%9D%B1%E4%BA%AC%E9%83%BD",
    );
  });

  it("includes parent name in the query when provided", () => {
    const city: Region = {
      id: "13101",
      type: "city",
      name: "千代田区",
      coordinate: { lat: 35.69, lng: 139.75 },
    };
    const url = getGoogleMapsUrl(city, "東京都");
    expect(url).toContain(encodeURIComponent("東京都 千代田区"));
  });
});
