// scripts/generateRegionsFromGeolonia.ts
// Geolonia API から地域データを取得し、D1 用 seed.sql を生成する

import * as fs from "fs";
import * as path from "path";
import type { Region } from "../src/types";
import { DESIGNATED_CITY_NAMES } from "../src/api/domain/services/DesignatedCityService";

type RegionType = Region["type"];

const JA_JSON_URL = "https://geolonia.github.io/japanese-addresses/api/ja.json";

type JaJson = Record<string, string[]>;

interface CityPoint {
  lat: number;
  lng: number;
}

interface TownPoint {
  lat: number;
  lng: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${url}, status=${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function fetchCityData(
  prefName: string,
  cityName: string,
): Promise<{
  cityPoint: CityPoint | null;
  townPoints: Map<string, TownPoint>;
}> {
  const url = `https://geolonia.github.io/japanese-addresses/api/ja/${encodeURIComponent(
    prefName,
  )}/${encodeURIComponent(cityName)}.json`;

  try {
    const rows = await fetchJson<
      {
        town: string;
        koaza: string;
        lat: number;
        lng: number;
        residential?: true;
      }[]
    >(url);

    if (!rows.length) {
      return { cityPoint: null, townPoints: new Map() };
    }

    let cityLatSum = 0;
    let cityLngSum = 0;
    let cityCount = 0;

    const townPoints = new Map<string, TownPoint>();

    for (const r of rows) {
      if (typeof r.lat !== "number" || typeof r.lng !== "number") continue;

      cityLatSum += r.lat;
      cityLngSum += r.lng;
      cityCount += 1;

      const townName = (r.town ?? "").trim();
      const koazaName = (r.koaza ?? "").trim();
      const key = koazaName ? `${townName} ${koazaName}` : townName;
      if (!key) continue;

      const existing = townPoints.get(key);
      if (existing) {
        existing.lat = (existing.lat + r.lat) / 2;
        existing.lng = (existing.lng + r.lng) / 2;
      } else {
        townPoints.set(key, { lat: r.lat, lng: r.lng });
      }
    }

    const cityPoint =
      cityCount > 0
        ? {
            lat: cityLatSum / cityCount,
            lng: cityLngSum / cityCount,
          }
        : null;

    return { cityPoint, townPoints };
  } catch (e) {
    console.error(
      `Failed to fetch city data for ${prefName} / ${cityName}:`,
      e,
    );
    return { cityPoint: null, townPoints: new Map() };
  }
}

function buildDesignatedCities(cities: Region[]): Region[] {
  const result: Region[] = [];

  for (const cityName of DESIGNATED_CITY_NAMES) {
    const wards = cities.filter(
      (c) => c.name.startsWith(cityName) && c.name !== cityName,
    );
    if (!wards.length) continue;

    const lat = wards.reduce((s, w) => s + w.coordinate.lat, 0) / wards.length;
    const lng = wards.reduce((s, w) => s + w.coordinate.lng, 0) / wards.length;
    const prefId = wards[0].parentId!;

    result.push({
      id: `DC-${prefId}-${cityName}`,
      type: "city",
      name: cityName,
      coordinate: { lat, lng },
      parentId: prefId,
    });
  }

  return result;
}

async function buildRegionsFromApi(): Promise<{
  prefectures: Region[];
  cities: Region[];
  towns: Region[];
}> {
  console.log("Fetching ja.json ...");
  const ja = await fetchJson<JaJson>(JA_JSON_URL);

  const prefectureNames = Object.keys(ja);
  console.log(`Found ${prefectureNames.length} prefectures in ja.json.`);

  const prefectures: Region[] = [];
  const cities: Region[] = [];
  const towns: Region[] = [];

  for (let i = 0; i < prefectureNames.length; i++) {
    const prefName = prefectureNames[i];

    const prefId = String(i + 1).padStart(2, "0");

    const cityNames = ja[prefName] ?? [];
    console.log(
      `Processing ${prefName} (${prefId}) with ${cityNames.length} cities...`,
    );

    const cityPoints: CityPoint[] = [];

    for (let j = 0; j < cityNames.length; j++) {
      const cityName = cityNames[j];
      const cityId = prefId + String(j + 1).padStart(3, "0");

      const { cityPoint, townPoints } = await fetchCityData(prefName, cityName);
      if (!cityPoint) {
        console.warn(`  [skip] no point for city: ${prefName} / ${cityName}`);
        continue;
      }

      cities.push({
        id: cityId,
        type: "city" as RegionType,
        name: cityName,
        coordinate: cityPoint,
        parentId: prefId,
      });

      cityPoints.push(cityPoint);

      let townIndex = 0;
      for (const [name, point] of townPoints.entries()) {
        townIndex += 1;
        const townId = `${cityId}-${String(townIndex).padStart(4, "0")}`;

        towns.push({
          id: townId,
          type: "town",
          name,
          coordinate: point,
          parentId: cityId,
        });
      }
    }

    if (cityPoints.length) {
      const latSum = cityPoints.reduce((sum, p) => sum + p.lat, 0);
      const lngSum = cityPoints.reduce((sum, p) => sum + p.lng, 0);
      const count = cityPoints.length;

      prefectures.push({
        id: prefId,
        type: "prefecture",
        name: prefName,
        coordinate: {
          lat: latSum / count,
          lng: lngSum / count,
        },
        parentId: "JP",
      });
    } else {
      console.warn(
        `  [skip] no cities with points for prefecture: ${prefName}`,
      );
    }
  }

  prefectures.sort((a, b) => a.id.localeCompare(b.id));
  cities.sort((a, b) => a.id.localeCompare(b.id));
  towns.sort((a, b) => a.id.localeCompare(b.id));

  return { prefectures, cities, towns };
}

// --- SQL 出力（単一ファイル） ---

const SEED_SQL_PATH = path.resolve(process.cwd(), "scripts", "seed.sql");

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

function regionToValues(r: Region): string {
  const parentId = r.parentId ?? null;
  const parentStr = parentId === null ? "NULL" : `'${escapeSql(parentId)}'`;
  return `('${escapeSql(r.id)}','${escapeSql(r.type)}','${escapeSql(r.name)}',${r.coordinate.lat},${r.coordinate.lng},${parentStr})`;
}

function buildSeedSql(allRegions: Region[], batchSize: number): string {
  const lines: string[] = [];

  lines.push(
    "-- D1 regions seed (generated by scripts/generateRegionsFromGeolonia.ts)",
  );
  lines.push("CREATE TABLE IF NOT EXISTS regions (");
  lines.push("  id TEXT PRIMARY KEY,");
  lines.push("  type TEXT NOT NULL,");
  lines.push("  name TEXT NOT NULL,");
  lines.push("  lat REAL NOT NULL,");
  lines.push("  lng REAL NOT NULL,");
  lines.push("  parent_id TEXT");
  lines.push(");");
  lines.push("");
  lines.push(
    "CREATE INDEX IF NOT EXISTS idx_regions_type_parent_id ON regions(type, parent_id);",
  );
  lines.push("");

  for (let i = 0; i < allRegions.length; i += batchSize) {
    const batch = allRegions.slice(i, i + batchSize);
    const values = batch.map(regionToValues).join(",\n  ");
    lines.push(
      "INSERT OR REPLACE INTO regions (id, type, name, lat, lng, parent_id) VALUES",
    );
    lines.push("  " + values + ";");
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const force = process.env.FORCE_REGENERATE_REGIONS === "1";

  if (!force && fs.existsSync(SEED_SQL_PATH)) {
    console.log(
      "scripts/seed.sql already exists. Skipping generation. (set FORCE_REGENERATE_REGIONS=1 to force)",
    );
    return;
  }

  const { prefectures, cities, towns } = await buildRegionsFromApi();

  console.log(
    `Built ${prefectures.length} prefectures, ${cities.length} cities, ${towns.length} towns.`,
  );

  const designatedCities = buildDesignatedCities(cities);
  console.log(
    `Built ${designatedCities.length} designated city aggregate records.`,
  );

  const allRegions = [...prefectures, ...cities, ...towns, ...designatedCities];
  const sql = buildSeedSql(allRegions, 500);
  fs.writeFileSync(SEED_SQL_PATH, sql, "utf8");

  console.log("Written scripts/seed.sql");
  console.log(
    "  Local:  npx wrangler d1 execute dart-map-regions --local --file=./scripts/seed.sql",
  );
  console.log(
    "  Remote: npx wrangler d1 execute dart-map-regions --remote --file=./scripts/seed.sql",
  );
}

main().catch((err) => {
  console.error("Error while generating seed from Geolonia API:", err);
  process.exitCode = 1;
});
