import type { Context } from "hono";
import { GetRegionsUseCase } from "../../usecases/GetRegionsUseCase";
import { DbEnv, JSON_UTF8, regionRepo } from "../handlerUtils";

export async function getRegionsHandler(c: Context<{ Bindings: DbEnv }>) {
  const type = c.req.query("type");
  if (type !== "prefecture" && type !== "city") {
    return c.json(
      {
        error:
          "Missing or invalid query parameter: type (must be prefecture or city)",
      },
      400,
    );
  }

  const parentId = c.req.query("parent_id");
  if (type === "city" && !parentId) {
    return c.json({ error: "parent_id is required when type=city" }, 400);
  }

  const mergeDesignated = c.req.query("merge_designated") === "true";
  const useCase = new GetRegionsUseCase(regionRepo(c));

  try {
    const regions = await useCase.run({
      type,
      parentId: parentId ?? undefined,
      mergeDesignated,
    });
    return c.json(regions, 200, JSON_UTF8);
  } catch (err) {
    console.error("getRegionsHandler error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
}
