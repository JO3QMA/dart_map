import { describe, it, expect, vi } from "vitest";
import app from "./router";

type D1Row = {
  id: string;
  type: string;
  name: string;
  lat: number;
  lng: number;
  parent_id: string | null;
};

function createMockDb(options: {
  allResults?: D1Row[];
  firstResult?: D1Row | null;
}): D1Database {
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({
        all: vi.fn(async () => ({ results: options.allResults ?? [] })),
        first: vi.fn(async () => options.firstResult ?? null),
      })),
    })),
  } as unknown as D1Database;
}

function createEnv(overrides?: Partial<{ DB: D1Database; ASSETS: Fetcher }>) {
  return {
    DB: createMockDb({
      allResults: [
        {
          id: "13",
          type: "prefecture",
          name: "東京都",
          lat: 35.6894,
          lng: 139.6917,
          parent_id: "JP",
        },
      ],
      firstResult: {
        id: "13",
        type: "prefecture",
        name: "東京都",
        lat: 35.6894,
        lng: 139.6917,
        parent_id: "JP",
      },
    }),
    ...overrides,
  };
}

describe("router", () => {
  it("routes GET /api/regions", async () => {
    const res = await app.request(
      "http://localhost/api/regions?type=prefecture",
      { method: "GET" },
      createEnv(),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("13");
  });

  it("routes GET /api/draw", async () => {
    const res = await app.request(
      "http://localhost/api/draw?mode=country",
      { method: "GET" },
      createEnv(),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ id: "13", type: "prefecture" });
  });

  it("routes GET /api/boundary", async () => {
    const mockMatch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ type: "FeatureCollection" }), { status: 200 }),
    );
    const mockPut = vi.fn();
    vi.stubGlobal("caches", { default: { match: mockMatch, put: mockPut } });

    try {
      const res = await app.request(
        "http://localhost/api/boundary?q=Tokyo",
        { method: "GET" },
        createEnv(),
      );

      expect(res.status).toBe(200);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("serves ASSETS for unmatched routes when ASSETS is configured", async () => {
    const mockAssetsFetch = vi
      .fn()
      .mockResolvedValue(new Response("<html>index</html>", { status: 200 }));
    const assets = { fetch: mockAssetsFetch } as unknown as Fetcher;

    const res = await app.request(
      "http://localhost/index.html",
      { method: "GET" },
      createEnv({ ASSETS: assets }),
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<html>index</html>");
    expect(mockAssetsFetch).toHaveBeenCalledOnce();
  });

  it("returns 500 for unmatched routes when ASSETS is not configured", async () => {
    const res = await app.request(
      "http://localhost/index.html",
      { method: "GET" },
      { DB: createMockDb({}) },
    );

    expect(res.status).toBe(500);
    expect(await res.text()).toBe("ASSETS binding is not configured.");
  });
});
