import type { Context } from "hono";
import { DrawRegionUseCase } from "../../usecases/DrawRegionUseCase";
import { DbEnv, JSON_UTF8, regionRepo } from "../handlerUtils";

export async function drawRegionHandler(c: Context<{ Bindings: DbEnv }>) {
  const mode = c.req.query("mode");
  if (mode !== "country" && mode !== "prefecture" && mode !== "city") {
    return c.json(
      {
        error:
          "Missing or invalid query parameter: mode (must be country, prefecture, or city)",
      },
      400,
    );
  }

  const parentId = c.req.query("parent_id");
  if ((mode === "prefecture" || mode === "city") && !parentId) {
    return c.json(
      { error: "parent_id is required when mode=prefecture or mode=city" },
      400,
    );
  }

  const mergeDesignated = c.req.query("merge_designated") === "true";
  const useCase = new DrawRegionUseCase(regionRepo(c));

  try {
    const region = await useCase.run({
      mode,
      parentId: parentId ?? undefined,
      mergeDesignated,
    });
    if (!region) {
      return c.json({ error: "No region found for the given criteria" }, 404);
    }
    return c.json(region, 200, JSON_UTF8);
  } catch (err) {
    console.error("drawRegionHandler error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
}
