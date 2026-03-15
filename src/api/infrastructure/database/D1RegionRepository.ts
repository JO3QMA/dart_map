import type { Region } from '../../domain/models/Region'
import type { IRegionRepository, RegionLevel } from '../../domain/repositories/IRegionRepository'

interface D1Row {
  id: string
  type: string
  name: string
  lat: number
  lng: number
  parent_id: string | null
}

function rowToRegion(row: D1Row): Region {
  return {
    id: row.id,
    type: row.type as Region['type'],
    name: row.name,
    coordinate: { lat: row.lat, lng: row.lng },
    parentId: row.parent_id ?? undefined,
  }
}

export class D1RegionRepository implements IRegionRepository {
  constructor(private readonly db: D1Database) {}

  async findByType(type: RegionLevel): Promise<Region[]> {
    const result = await this.db
      .prepare('SELECT id, type, name, lat, lng, parent_id FROM regions WHERE type = ?')
      .bind(type)
      .all<D1Row>()
    return (result.results ?? []).map(rowToRegion)
  }

  async findByTypeAndParent(type: RegionLevel, parentId: string): Promise<Region[]> {
    const result = await this.db
      .prepare(
        'SELECT id, type, name, lat, lng, parent_id FROM regions WHERE type = ? AND parent_id = ?',
      )
      .bind(type, parentId)
      .all<D1Row>()
    return (result.results ?? []).map(rowToRegion)
  }

  async findRandom(type: RegionLevel, parentId: string | null): Promise<Region | null> {
    const parent = parentId ?? 'JP'
    const row = await this.db
      .prepare(
        'SELECT id, type, name, lat, lng, parent_id FROM regions WHERE type = ? AND parent_id = ? ORDER BY RANDOM() LIMIT 1',
      )
      .bind(type, parent)
      .first<D1Row>()
    return row ? rowToRegion(row) : null
  }

  async findRandomTownAmongParentIds(parentIds: string[]): Promise<Region | null> {
    if (parentIds.length === 0) return null
    const placeholders = parentIds.map(() => '?').join(',')
    const row = await this.db
      .prepare(
        `SELECT id, type, name, lat, lng, parent_id FROM regions WHERE type = 'town' AND parent_id IN (${placeholders}) ORDER BY RANDOM() LIMIT 1`,
      )
      .bind(...parentIds)
      .first<D1Row>()
    return row ? rowToRegion(row) : null
  }
}
