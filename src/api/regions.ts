import type { Region } from "../types";
import { D1RegionRepository } from "./infrastructure/database/D1RegionRepository";
import {
  getWardFilter,
  isDesignatedCityId,
  mergeCitiesWithDesignated,
} from "./domain/services/DesignatedCityService";

export type GetRegionsType = "prefecture" | "city";

export interface GetRegionsInput {
  type: GetRegionsType;
  parentId?: string;
  mergeDesignated?: boolean;
}

export type DrawMode = "country" | "prefecture" | "city";

export interface DrawRegionInput {
  mode: DrawMode;
  parentId?: string;
  mergeDesignated?: boolean;
}

function pickRandom<T>(items: T[]): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

export async function getRegions(
  repo: D1RegionRepository,
  input: GetRegionsInput,
): Promise<Region[]> {
  if (input.type === "prefecture") {
    return repo.findByType("prefecture");
  }

  if (input.type === "city") {
    if (!input.parentId) {
      throw new Error("parent_id is required when type=city");
    }
    const cities = await repo.findByTypeAndParent("city", input.parentId);
    if (!input.mergeDesignated) return cities;

    const designated = cities.filter((c) => isDesignatedCityId(c.id));
    const raw = cities.filter((c) => !isDesignatedCityId(c.id));
    return mergeCitiesWithDesignated(raw, designated);
  }

  throw new Error(`Unsupported type: ${input.type}`);
}

export async function drawRegion(
  repo: D1RegionRepository,
  input: DrawRegionInput,
): Promise<Region | null> {
  if (input.mode === "country") {
    return repo.findRandom("prefecture", "JP");
  }

  if (input.mode === "prefecture") {
    if (!input.parentId) {
      throw new Error("parent_id is required when mode=prefecture");
    }
    if (!input.mergeDesignated) {
      return repo.findRandom("city", input.parentId);
    }
    const cities = await repo.findByTypeAndParent("city", input.parentId);
    const designated = cities.filter((c) => isDesignatedCityId(c.id));
    const raw = cities.filter((c) => !isDesignatedCityId(c.id));
    const merged = mergeCitiesWithDesignated(raw, designated);
    if (merged.length === 0) return null;
    return pickRandom(merged);
  }

  if (input.mode === "city") {
    if (!input.parentId) {
      throw new Error("parent_id is required when mode=city");
    }
    if (isDesignatedCityId(input.parentId)) {
      const cityName = getWardFilter(input.parentId);
      if (!cityName) return null;
      const prefId = input.parentId.split("-")[1];
      if (!prefId) return null;
      const cities = await repo.findByTypeAndParent("city", prefId);
      const wardIds = cities
        .filter((c) => c.name.startsWith(cityName) && c.name !== cityName)
        .map((c) => c.id);
      if (wardIds.length === 0) return null;
      return repo.findRandomTownAmongParentIds(wardIds);
    }
    return repo.findRandom("town", input.parentId);
  }

  throw new Error(`Unsupported mode: ${input.mode}`);
}
