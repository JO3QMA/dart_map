import type { Region, RegionLevel, GameMode } from '../types';

const cache: Record<string, Region[]> = {};

export const DESIGNATED_CITY_NAMES: string[] = [
    '札幌市',
    '仙台市',
    'さいたま市',
    '千葉市',
    '横浜市',
    '川崎市',
    '相模原市',
    '新潟市',
    '静岡市',
    '浜松市',
    '名古屋市',
    '京都市',
    '大阪市',
    '堺市',
    '神戸市',
    '岡山市',
    '広島市',
    '北九州市',
    '福岡市',
    '熊本市',
];

let designatedCitiesCache: Region[] | null = null;

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

async function loadDesignatedCities(): Promise<Region[]> {
    if (designatedCitiesCache) {
        return designatedCitiesCache;
    }

    const response = await fetch('/data/designated_cities.json');
    const data: Region[] = await response.json();
    designatedCitiesCache = data;
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

export async function fetchDesignatedCities(prefId?: string): Promise<Region[]> {
    const regions = await loadDesignatedCities();
    if (prefId) {
        return regions.filter((r) => r.parentId === prefId);
    }
    return regions;
}

export function mergeCitiesWithDesignated(
    cities: Region[],
    designated: Region[],
): Region[] {
    if (!designated.length) {
        return cities;
    }

    const prefixes = designated.map((d) => d.name);

    const filteredCities = cities.filter((c) => {
        return !prefixes.some((p) => c.name.startsWith(p) && c.name !== p);
    });

    const merged = [...filteredCities, ...designated].sort((a, b) =>
        a.name.localeCompare(b.name, 'ja'),
    );

    return merged;
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
    parentId?: string,
): Promise<Region> {
    const targetLevel = getTargetLevel(mode);
    const regions = await fetchRegions(targetLevel, parentId);

    if (regions.length === 0) {
        throw new Error(`No regions found for mode=${mode}, parentId=${parentId}`);
    }

    return pickRandom(regions);
}

export function pickRandom<T>(items: T[]): T {
    const index = Math.floor(Math.random() * items.length);
    return items[index];
}

export function getWardIdsForDesignatedCity(
    designatedCityIdOrName: string,
    allCities: Region[],
): string[] {
    let prefix = designatedCityIdOrName;

    if (designatedCityIdOrName.startsWith('DC-')) {
        const parts = designatedCityIdOrName.split('-').slice(2);
        prefix = parts.join('-');
    }

    if (!DESIGNATED_CITY_NAMES.includes(prefix)) {
        return [];
    }

    return allCities
        .filter((c) => c.name.startsWith(prefix) && c.name !== prefix)
        .map((c) => c.id);
}

export async function fetchRandomTargetFromDesignatedCity(wardIds: string[]): Promise<Region> {
    if (!wardIds.length) {
        throw new Error('No ward ids found for designated city');
    }

    const towns = await fetchRegions('town');
    const candidates = towns.filter((t) => t.parentId && wardIds.includes(t.parentId));

    if (!candidates.length) {
        throw new Error('No towns found for designated city wards');
    }

    return pickRandom(candidates);
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
