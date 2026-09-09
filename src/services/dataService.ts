import type { Region, RegionLevel, GameMode } from "../types";

const API_BASE = "";

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
  const search = new URLSearchParams({ type: level });
  if (parentId) search.set("parent_id", parentId);
  if (mergeDesignated) search.set("merge_designated", "true");
  const query = search.toString();
  const res = await fetch(
    `${API_BASE}/api/regions${query ? `?${query}` : ""}`,
  );
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
  const search = new URLSearchParams({ mode });
  if (parentId) search.set("parent_id", parentId);
  if (mergeDesignated) search.set("merge_designated", "true");
  const query = search.toString();
  const res = await fetch(`${API_BASE}/api/draw${query ? `?${query}` : ""}`);
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
