import { Hono } from "hono";
import { getRegionsHandler } from "./handlers/GetRegionsHandler";
import { drawRegionHandler } from "./handlers/DrawRegionHandler";
import { boundaryHandler } from "./handlers/BoundaryHandler";

export type Env = { DB: D1Database; ASSETS: Fetcher };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/regions", getRegionsHandler);
app.get("/api/draw", drawRegionHandler);
app.get("/api/boundary", boundaryHandler);

app.all("*", async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return new Response("ASSETS binding is not configured.", {
    status: 500,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
});

export default app;
