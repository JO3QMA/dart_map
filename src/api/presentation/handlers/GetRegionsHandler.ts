import type { Context } from 'hono'
import { GetRegionsUseCase } from '../../usecases/GetRegionsUseCase'
import { D1RegionRepository } from '../../infrastructure/database/D1RegionRepository'

export type Env = { DB: D1Database }

export async function getRegionsHandler(c: Context<{ Bindings: Env }>) {
  const type = c.req.query('type')
  if (type !== 'prefecture' && type !== 'city') {
    return c.json(
      { error: 'Missing or invalid query parameter: type (must be prefecture or city)' },
      400,
    )
  }

  const parentId = c.req.query('parent_id')
  if (type === 'city' && !parentId) {
    return c.json({ error: 'parent_id is required when type=city' }, 400)
  }

  const mergeDesignated = c.req.query('merge_designated') === 'true'

  const repo = new D1RegionRepository(c.env.DB)
  const useCase = new GetRegionsUseCase(repo)

  try {
    const regions = await useCase.run({
      type,
      parentId: parentId ?? undefined,
      mergeDesignated,
    })
    return c.json(regions, 200, {
      'Content-Type': 'application/json; charset=utf-8',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return c.json({ error: message }, 500)
  }
}
