import type { Region } from '../domain/models/Region'
import type { IRegionRepository } from '../domain/repositories/IRegionRepository'
import {
  getWardFilter,
  isDesignatedCityId,
  mergeCitiesWithDesignated,
} from '../domain/services/DesignatedCityService'

export type DrawMode = 'country' | 'prefecture' | 'city'

export interface DrawRegionInput {
  mode: DrawMode
  parentId?: string
  mergeDesignated?: boolean
}

function pickRandom<T>(items: T[]): T {
  const index = Math.floor(Math.random() * items.length)
  return items[index]
}

export class DrawRegionUseCase {
  constructor(private readonly repo: IRegionRepository) {}

  async run(input: DrawRegionInput): Promise<Region | null> {
    if (input.mode === 'country') {
      return this.repo.findRandom('prefecture', 'JP')
    }

    if (input.mode === 'prefecture') {
      if (!input.parentId) throw new Error('parent_id is required when mode=prefecture')
      if (!input.mergeDesignated) {
        return this.repo.findRandom('city', input.parentId)
      }
      const cities = await this.repo.findByTypeAndParent('city', input.parentId)
      const designated = cities.filter((c) => isDesignatedCityId(c.id))
      const raw = cities.filter((c) => !isDesignatedCityId(c.id))
      const merged = mergeCitiesWithDesignated(raw, designated)
      if (merged.length === 0) return null
      return pickRandom(merged)
    }

    if (input.mode === 'city') {
      if (!input.parentId) throw new Error('parent_id is required when mode=city')
      if (isDesignatedCityId(input.parentId)) {
        const cityName = getWardFilter(input.parentId)
        if (!cityName) return null
        const prefId = input.parentId.split('-')[1]
        if (!prefId) return null
        const cities = await this.repo.findByTypeAndParent('city', prefId)
        const wardIds = cities
          .filter((c) => c.name.startsWith(cityName) && c.name !== cityName)
          .map((c) => c.id)
        if (wardIds.length === 0) return null
        return this.repo.findRandomTownAmongParentIds(wardIds)
      }
      return this.repo.findRandom('town', input.parentId)
    }

    throw new Error(`Unsupported mode: ${input.mode}`)
  }
}
