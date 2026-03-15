import type { Region } from '../domain/models/Region'
import type { IRegionRepository } from '../domain/repositories/IRegionRepository'
import {
  isDesignatedCityId,
  mergeCitiesWithDesignated,
} from '../domain/services/DesignatedCityService'

export type GetRegionsType = 'prefecture' | 'city'

export interface GetRegionsInput {
  type: GetRegionsType
  parentId?: string
  mergeDesignated?: boolean
}

export class GetRegionsUseCase {
  constructor(private readonly repo: IRegionRepository) {}

  async run(input: GetRegionsInput): Promise<Region[]> {
    if (input.type === 'prefecture') {
      const list = await this.repo.findByType('prefecture')
      return list
    }

    if (input.type === 'city') {
      if (!input.parentId) {
        throw new Error('parent_id is required when type=city')
      }
      const cities = await this.repo.findByTypeAndParent('city', input.parentId)
      if (!input.mergeDesignated) return cities

      const designated = cities.filter((c) => isDesignatedCityId(c.id))
      const raw = cities.filter((c) => !isDesignatedCityId(c.id))
      return mergeCitiesWithDesignated(raw, designated)
    }

    throw new Error(`Unsupported type: ${input.type}`)
  }
}
