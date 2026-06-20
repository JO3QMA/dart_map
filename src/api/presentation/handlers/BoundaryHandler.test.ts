import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { boundaryHandler } from "./BoundaryHandler";

function createApp() {
  const app = new Hono();
  app.get("/api/boundary", boundaryHandler);
  return (path: string) =>
    app.request(`http://localhost${path}`, { method: "GET" });
}

describe("boundaryHandler", () => {
  const mockMatch = vi.fn();
  const mockPut = vi.fn();
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockMatch.mockReset().mockResolvedValue(undefined);
    mockPut.mockReset().mockResolvedValue(undefined);
    mockFetch.mockReset();
    vi.stubGlobal("caches", { default: { match: mockMatch, put: mockPut } });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 400 when q is missing", async () => {
    const request = createApp();
    const res = await request("/api/boundary");

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Missing required query parameter: q",
    });
  });

  it("returns 400 when q exceeds max length", async () => {
    const request = createApp();
    const longQuery = "a".repeat(201);
    const res = await request(`/api/boundary?q=${longQuery}`);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Query parameter 'q' must be 200 characters or fewer",
    });
  });

  it("returns cached response on cache hit", async () => {
    const cachedBody = JSON.stringify({
      type: "FeatureCollection",
      features: [],
    });
    mockMatch.mockResolvedValue(
      new Response(cachedBody, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const request = createApp();
    const res = await request("/api/boundary?q=Tokyo");

    expect(res.status).toBe(200);
    expect(await res.text()).toBe(cachedBody);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("fetches upstream, caches, and returns on cache miss", async () => {
    const upstreamBody = JSON.stringify({
      type: "Feature",
      properties: { name: "Tokyo" },
    });
    mockFetch.mockResolvedValue(
      new Response(upstreamBody, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const request = createApp();
    const res = await request("/api/boundary?q=Tokyo");

    expect(res.status).toBe(200);
    expect(await res.text()).toBe(upstreamBody);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockPut).toHaveBeenCalledOnce();
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=2592000");
  });

  it("stores upstream response in cache before returning", async () => {
    const upstreamBody = JSON.stringify({
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: { name: "Osaka" } }],
    });
    mockFetch.mockResolvedValue(
      new Response(upstreamBody, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const request = createApp();
    const res = await request("/api/boundary?q=Osaka");

    expect(res.status).toBe(200);
    expect(await res.text()).toBe(upstreamBody);
    expect(mockPut).toHaveBeenCalledOnce();
    const [cacheKey, cachedResponse] = mockPut.mock.calls[0] as [
      Request,
      Response,
    ];
    expect(cacheKey.url).toContain("/api/boundary?q=Osaka");
    expect(cachedResponse.status).toBe(200);
    expect(await cachedResponse.clone().text()).toBe(upstreamBody);
  });

  it("returns 502 when fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));

    const request = createApp();
    const res = await request("/api/boundary?q=Tokyo");

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({
      error: "Failed to fetch boundary data from Nominatim.",
    });
  });
});
