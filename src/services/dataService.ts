import type { Region, RegionLevel, GameMode } from '../types';

const cache: Record<string, Region[]> = {};

async function loadData(level: RegionLevel): Promise<Region[]> {
    const fileMap: Record<RegionLevel, string> = {
        country: '',
        prefecture: '/data/prefectures.json',
        city: '/data/cities.json',
        town: '/data/towns.json',
    };

    const path = fileMap[level];
    if (!path) return [];

    if (cache[level]) {
        return cache[level];
    }

    const response = await fetch(path);
    const data: Region[] = await response.json();
    cache[level] = data;
    return data;
}

export async function fetchRegions(
    level: RegionLevel,
    parentId?: string
): Promise<Region[]> {
    const regions = await loadData(level);
    if (parentId) {
        return regions.filter((r) => r.parentId === parentId);
    }
    return regions;
}

function getTargetLevel(mode: GameMode): RegionLevel {
    switch (mode) {
        case 'country':
            return 'prefecture';
        case 'prefecture':
            return 'city';
        case 'city':
            return 'town';
    }
}

export async function fetchRandomTarget(
    mode: GameMode,
    parentId?: string
): Promise<Region> {
    const targetLevel = getTargetLevel(mode);
    const regions = await fetchRegions(targetLevel, parentId);

    if (regions.length === 0) {
        throw new Error(`No regions found for mode=${mode}, parentId=${parentId}`);
    }

    const index = Math.floor(Math.random() * regions.length);
    return regions[index];
}

export function getNextMode(currentMode: GameMode): GameMode | null {
    switch (currentMode) {
        case 'country':
            return 'prefecture';
        case 'prefecture':
            return 'city';
        default:
            return null;
    }
}

export function getGoogleMapsUrl(region: Region, parentName?: string): string {
    const query = parentName ? `${parentName} ${region.name}` : region.name;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
