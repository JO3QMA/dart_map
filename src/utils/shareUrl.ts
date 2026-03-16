import type { Region, GameMode, RegionLevel } from "../types";

const REGION_LEVELS: readonly RegionLevel[] = [
  "country",
  "prefecture",
  "city",
  "town",
];
const GAME_MODES: readonly GameMode[] = ["country", "prefecture", "city"];

export interface ResultSharePayload {
  result: Region;
  mode: GameMode;
  parentName?: string;
  selectedPrefecture?: string | null;
  selectedCity?: string | null;
}

/**
 * Build URLSearchParams for a shareable result URL (readable query params).
 */
export function buildResultSearchParams(
  payload: ResultSharePayload,
): URLSearchParams {
  const { result, mode, parentName, selectedPrefecture, selectedCity } =
    payload;
  const params = new URLSearchParams();
  params.set("id", result.id);
  params.set("type", result.type);
  params.set("name", result.name);
  params.set("lat", String(result.coordinate.lat));
  params.set("lng", String(result.coordinate.lng));
  params.set("mode", mode);
  if (result.parentId !== undefined && result.parentId !== "") {
    params.set("parentId", result.parentId);
  }
  if (parentName !== undefined && parentName !== "") {
    params.set("parent", parentName);
  }
  if (selectedPrefecture !== undefined && selectedPrefecture !== null) {
    params.set("prefecture", selectedPrefecture);
  }
  if (selectedCity !== undefined && selectedCity !== null) {
    params.set("city", selectedCity);
  }
  return params;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Parse result payload from location.search. Returns null if required params
 * are missing or invalid.
 */
export function parseResultFromSearch(
  search: string,
): ResultSharePayload | null {
  const params = new URLSearchParams(search);
  const id = params.get("id");
  const type = params.get("type");
  const name = params.get("name");
  const latRaw = params.get("lat");
  const lngRaw = params.get("lng");
  const mode = params.get("mode");

  if (
    !id ||
    !type ||
    name === null ||
    latRaw === null ||
    lngRaw === null ||
    !mode
  ) {
    return null;
  }

  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
    return null;
  }

  if (!REGION_LEVELS.includes(type as RegionLevel)) {
    return null;
  }
  if (!GAME_MODES.includes(mode as GameMode)) {
    return null;
  }

  const parentId = params.get("parentId") ?? undefined;
  const parentName = params.get("parent") ?? undefined;
  const selectedPrefecture = params.get("prefecture") ?? null;
  const selectedCity = params.get("city") ?? null;

  const result: Region = {
    id,
    type: type as RegionLevel,
    name,
    coordinate: { lat, lng },
    ...(parentId ? { parentId } : {}),
  };

  return {
    result,
    mode: mode as GameMode,
    ...(parentName ? { parentName } : {}),
    selectedPrefecture: selectedPrefecture || null,
    selectedCity: selectedCity || null,
  };
}

/**
 * Build full share URL for the current result (origin + pathname + query).
 * Returns empty string when window is not available (e.g. SSR).
 */
export function getResultShareUrl(payload: ResultSharePayload): string {
  if (typeof window === "undefined") {
    return "";
  }
  const params = buildResultSearchParams(payload);
  const query = params.toString();
  const base = `${window.location.origin}${window.location.pathname}`;
  return query ? `${base}?${query}` : base;
}
