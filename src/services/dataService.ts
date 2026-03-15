import type { Region, RegionLevel, GameMode } from "../types";

const API_BASE = "";

function buildParams(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, v);
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

/**
 * 地域リストをAPIから取得する。
 * type=city のときは parent_id 必須。merge_designated=true で政令指定都市の区をまとめる。
 */
export async function fetchRegions(
  level: Exclude<RegionLevel, "country" | "town">,
  parentId?: string,
  mergeDesignated?: boolean,
): Promise<Region[]> {
  if (level === "city" && !parentId) {
    throw new Error("parentId is required when fetching city level regions");
  }
  const params: Record<string, string> = { type: level };
  if (parentId) params.parent_id = parentId;
  if (mergeDesignated) params.merge_designated = "true";
  const res = await fetch(`${API_BASE}/api/regions${buildParams(params)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ??
        `Failed to fetch regions: ${res.status}`,
    );
  }
  return res.json();
}

/**
 * 指定条件でランダムに1件の地域を抽選する。merge_designated で政令指定都市をまとめた母集団から抽選。
 */
export async function fetchRandomTarget(
  mode: GameMode,
  parentId?: string,
  mergeDesignated?: boolean,
): Promise<Region> {
  const params: Record<string, string> = { mode };
  if (parentId) params.parent_id = parentId;
  if (mergeDesignated) params.merge_designated = "true";
  const res = await fetch(`${API_BASE}/api/draw${buildParams(params)}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("No region found for the given criteria");
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `Failed to draw: ${res.status}`,
    );
  }
  return res.json();
}

export function getNextMode(currentMode: GameMode): GameMode | null {
  switch (currentMode) {
    case "country":
      return "prefecture";
    case "prefecture":
      return "city";
    default:
      return null;
  }
}

export function getGoogleMapsUrl(region: Region, parentName?: string): string {
  const query = parentName ? `${parentName} ${region.name}` : region.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
