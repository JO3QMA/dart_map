import type { Region } from '../models/Region'

export type RegionLevel = 'prefecture' | 'city' | 'town'

export interface IRegionRepository {
  findByType(type: RegionLevel): Promise<Region[]>
  findByTypeAndParent(type: RegionLevel, parentId: string): Promise<Region[]>
  findRandom(type: RegionLevel, parentId: string | null): Promise<Region | null>
  /** For designated city (DC-*): draw one town from the set of ward city IDs */
  findRandomTownAmongParentIds(parentIds: string[]): Promise<Region | null>
}
