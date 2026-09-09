import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { drawRegionHandler } from "./DrawRegionHandler";
import { createMockDb } from "../../../test/mockD1";

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: { DB: D1Database } }>();
  app.get("/api/draw", drawRegionHandler);
  return (path: string) =>
    app.request(`http://localhost${path}`, { method: "GET" }, { DB: db });
}

describe("drawRegionHandler", () => {
  it("returns 400 when mode is invalid", async () => {
    const request = createApp(createMockDb({}));
    const res = await request("/api/draw?mode=invalid");

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("mode"),
    });
  });

  it("returns 400 when mode=prefecture without parent_id", async () => {
    const request = createApp(createMockDb({}));
    const res = await request("/api/draw?mode=prefecture");

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "parent_id is required when mode=prefecture or mode=city",
    });
  });

  it("returns 404 when no region is found", async () => {
    const request = createApp(createMockDb({ firstResult: null }));
    const res = await request("/api/draw?mode=country");

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      error: "No region found for the given criteria",
    });
  });

  it("returns 200 with a drawn region", async () => {
    const db = createMockDb({
      firstResult: {
        id: "13",
        type: "prefecture",
        name: "東京都",
        lat: 35.6894,
        lng: 139.6917,
        parent_id: "JP",
      },
    });
    const request = createApp(db);
    const res = await request("/api/draw?mode=country");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      id: "13",
      type: "prefecture",
      name: "東京都",
      coordinate: { lat: 35.6894, lng: 139.6917 },
      parentId: "JP",
    });
  });
});
