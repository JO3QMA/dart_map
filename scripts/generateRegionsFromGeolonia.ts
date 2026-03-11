// scripts/generateRegionsFromGeolonia.ts

import * as fs from 'fs';
import * as path from 'path';
import https from 'https';
import type { Region } from '../src/types';

type RegionType = Region['type'];

const JA_JSON_URL = 'https://geolonia.github.io/japanese-addresses/api/ja.json';

type JaJson = Record<string, string[]>;

interface CityPoint {
  lat: number;
  lng: number;
}

interface TownPoint {
  lat: number;
  lng: number;
}

// --- HTTP JSON フェッチ ---

function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`Request failed: ${url}, status=${res.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            const text = Buffer.concat(chunks).toString('utf8');
            const json = JSON.parse(text) as T;
            resolve(json);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', (err) => reject(err));
  });
}

// --- 町丁目 JSON から市区町村代表点と町データを計算 ---

async function fetchCityData(
  prefName: string,
  cityName: string,
): Promise<{ cityPoint: CityPoint | null; townPoints: Map<string, TownPoint> }> {
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
      if (typeof r.lat !== 'number' || typeof r.lng !== 'number') continue;

      cityLatSum += r.lat;
      cityLngSum += r.lng;
      cityCount += 1;

      const townName = (r.town ?? '').trim();
      const koazaName = (r.koaza ?? '').trim();
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
    console.error(`Failed to fetch city data for ${prefName} / ${cityName}:`, e);
    return { cityPoint: null, townPoints: new Map() };
  }
}

// --- 都道府県・市区町村 Region を生成 ---

async function buildRegionsFromApi(): Promise<{ prefectures: Region[]; cities: Region[]; towns: Region[] }> {
  console.log('Fetching ja.json ...');
  const ja = await fetchJson<JaJson>(JA_JSON_URL);

  const prefectureNames = Object.keys(ja);
  console.log(`Found ${prefectureNames.length} prefectures in ja.json.`);

  const prefectures: Region[] = [];
  const cities: Region[] = [];
  const towns: Region[] = [];

  for (let i = 0; i < prefectureNames.length; i++) {
    const prefName = prefectureNames[i];

    // 都道府県 ID: "01"〜（ja.jsonの順に採番）
    const prefId = String(i + 1).padStart(2, '0');

    const cityNames = ja[prefName] ?? [];
    console.log(`Processing ${prefName} (${prefId}) with ${cityNames.length} cities...`);

    const cityPoints: CityPoint[] = [];

    for (let j = 0; j < cityNames.length; j++) {
      const cityName = cityNames[j];
      const cityId = prefId + String(j + 1).padStart(3, '0'); // 例: "13001"

      const { cityPoint, townPoints } = await fetchCityData(prefName, cityName);
      if (!cityPoint) {
        console.warn(`  [skip] no point for city: ${prefName} / ${cityName}`);
        continue;
      }

      cities.push({
        id: cityId,
        type: 'city' as RegionType,
        name: cityName,
        coordinate: cityPoint,
        parentId: prefId,
      });

      cityPoints.push(cityPoint);

      let townIndex = 0;
      for (const [name, point] of townPoints.entries()) {
        townIndex += 1;
        const townId = `${cityId}-${String(townIndex).padStart(4, '0')}`;

        towns.push({
          id: townId,
          type: 'town',
          name,
          coordinate: point,
          parentId: cityId,
        });
      }
    }

    // 都道府県代表点 = その都道府県に属する市区町村代表点の平均
    if (cityPoints.length) {
      const latSum = cityPoints.reduce((sum, p) => sum + p.lat, 0);
      const lngSum = cityPoints.reduce((sum, p) => sum + p.lng, 0);
      const count = cityPoints.length;

      prefectures.push({
        id: prefId,
        type: 'prefecture',
        name: prefName,
        coordinate: {
          lat: latSum / count,
          lng: lngSum / count,
        },
        parentId: 'JP',
      });
    } else {
      console.warn(`  [skip] no cities with points for prefecture: ${prefName}`);
    }
  }

  prefectures.sort((a, b) => a.id.localeCompare(b.id));
  cities.sort((a, b) => a.id.localeCompare(b.id));
  towns.sort((a, b) => a.id.localeCompare(b.id));

  return { prefectures, cities, towns };
}

// --- 出力ユーティリティ ---

function ensureDirExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeJson(filePath: string, data: unknown): void {
  ensureDirExists(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
}

// --- エントリーポイント ---

async function main() {
  const { prefectures, cities, towns } = await buildRegionsFromApi();

  console.log(`Built ${prefectures.length} prefectures, ${cities.length} cities, ${towns.length} towns.`);

  const publicDataDir = path.resolve(process.cwd(), 'public', 'data');
  writeJson(path.join(publicDataDir, 'prefectures.json'), prefectures);
  writeJson(path.join(publicDataDir, 'cities.json'), cities);
  writeJson(path.join(publicDataDir, 'towns.json'), towns);

  console.log('Written prefectures.json, cities.json and towns.json under public/data.');
}

main().catch((err) => {
  console.error('Error while generating regions from Geolonia API:', err);
  process.exitCode = 1;
});

