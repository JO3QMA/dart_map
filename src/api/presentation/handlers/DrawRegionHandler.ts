import type { Context } from 'hono';
import { DrawRegionUseCase } from '../../usecases/DrawRegionUseCase';
import { D1RegionRepository } from '../../infrastructure/database/D1RegionRepository';

export type Env = { DB: D1Database };

export async function drawRegionHandler(c: Context<{ Bindings: Env }>) {
  const mode = c.req.query('mode');
  if (mode !== 'country' && mode !== 'prefecture' && mode !== 'city') {
    return c.json(
      { error: 'Missing or invalid query parameter: mode (must be country, prefecture, or city)' },
      400,
    );
  }

  const parentId = c.req.query('parent_id');
  if ((mode === 'prefecture' || mode === 'city') && !parentId) {
    return c.json({ error: 'parent_id is required when mode=prefecture or mode=city' }, 400);
  }

  const mergeDesignated = c.req.query('merge_designated') === 'true';

  const repo = new D1RegionRepository(c.env.DB);
  const useCase = new DrawRegionUseCase(repo);

  try {
    const region = await useCase.run({
      mode,
      parentId: parentId ?? undefined,
      mergeDesignated,
    });
    if (!region) {
      return c.json({ error: 'No region found for the given criteria' }, 404);
    }
    return c.json(region, 200, {
      'Content-Type': 'application/json; charset=utf-8',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return c.json({ error: message }, 500);
  }
}
