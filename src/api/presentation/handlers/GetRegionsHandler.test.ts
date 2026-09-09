import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { getRegionsHandler } from "./GetRegionsHandler";
import { createMockDb } from "../../../test/mockD1";

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: { DB: D1Database } }>();
  app.get("/api/regions", getRegionsHandler);
  return (path: string) =>
    app.request(`http://localhost${path}`, { method: "GET" }, { DB: db });
}

describe("getRegionsHandler", () => {
  it("returns 400 when type is missing", async () => {
    const request = createApp(createMockDb({}));
    const res = await request("/api/regions");

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("type"),
    });
  });

  it("returns 400 when type is invalid", async () => {
    const request = createApp(createMockDb({}));
    const res = await request("/api/regions?type=invalid");

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("type"),
    });
  });

  it("returns 400 when type=city without parent_id", async () => {
    const request = createApp(createMockDb({}));
    const res = await request("/api/regions?type=city");

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "parent_id is required when type=city",
    });
  });

  it("returns 200 with regions from mock DB", async () => {
    const db = createMockDb({
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
    });
    const request = createApp(db);
    const res = await request("/api/regions?type=prefecture");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([
      {
        id: "13",
        type: "prefecture",
        name: "東京都",
        coordinate: { lat: 35.6894, lng: 139.6917 },
        parentId: "JP",
      },
    ]);
  });

  it("returns 500 when region query fails", async () => {
    const request = createApp(createMockDb({ throwOnQuery: true }));
    const res = await request("/api/regions?type=prefecture");

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Internal server error",
    });
  });
});
