// scripts/generateRegionsFromGeolonia.ts

import * as fs from 'fs';
import * as path from 'path';
import https from 'https';
import type { Region } from '../src/types';

type RegionType = Region['type'];

// 統合市名 → cities.json の name プレフィックスのマッピング
// 区名は必ず「<市名><区名>」形式になっているため、startsWith で判定できる
const DESIGNATED_CITIES: { name: string; prefix: string }[] = [
  { name: '札幌市', prefix: '札幌市' },
  { name: '仙台市', prefix: '仙台市' },
  { name: 'さいたま市', prefix: 'さいたま市' },
  { name: '千葉市', prefix: '千葉市' },
  { name: '横浜市', prefix: '横浜市' },
  { name: '川崎市', prefix: '川崎市' },
  { name: '相模原市', prefix: '相模原市' },
  { name: '新潟市', prefix: '新潟市' },
  { name: '静岡市', prefix: '静岡市' },
  { name: '浜松市', prefix: '浜松市' },
  { name: '名古屋市', prefix: '名古屋市' },
  { name: '京都市', prefix: '京都市' },
  { name: '大阪市', prefix: '大阪市' },
  { name: '堺市', prefix: '堺市' },
  { name: '神戸市', prefix: '神戸市' },
  { name: '岡山市', prefix: '岡山市' },
  { name: '広島市', prefix: '広島市' },
  { name: '北九州市', prefix: '北九州市' },
  { name: '福岡市', prefix: '福岡市' },
  { name: '熊本市', prefix: '熊本市' },
];

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

function buildDesignatedCities(cities: Region[]): Region[] {
  const result: Region[] = [];

  for (const def of DESIGNATED_CITIES) {
    const wards = cities.filter((c) => c.name.startsWith(def.prefix) && c.name !== def.name);
    if (!wards.length) continue;

    const lat = wards.reduce((s, w) => s + w.coordinate.lat, 0) / wards.length;
    const lng = wards.reduce((s, w) => s + w.coordinate.lng, 0) / wards.length;
    const prefId = wards[0].parentId!;

    result.push({
      id: `DC-${prefId}-${def.prefix}`,
      type: 'city',
      name: def.name,
      coordinate: { lat, lng },
      parentId: prefId,
    });
  }

  return result;
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

const PUBLIC_DATA_DIR = path.resolve(process.cwd(), 'public', 'data');
const OUTPUT_FILES = [
  path.join(PUBLIC_DATA_DIR, 'prefectures.json'),
  path.join(PUBLIC_DATA_DIR, 'cities.json'),
  path.join(PUBLIC_DATA_DIR, 'towns.json'),
  path.join(PUBLIC_DATA_DIR, 'designated_cities.json'),
];

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
  const force = process.env.FORCE_REGENERATE_REGIONS === '1';

  // すでに全ての生成物が存在し、かつ強制再生成フラグが無い場合はスキップ
  if (!force && OUTPUT_FILES.every((file) => fs.existsSync(file))) {
    console.log(
      'Region JSON files already exist. Skipping generation. (set FORCE_REGENERATE_REGIONS=1 to force)',
    );
    return;
  }

  const { prefectures, cities, towns } = await buildRegionsFromApi();

  console.log(`Built ${prefectures.length} prefectures, ${cities.length} cities, ${towns.length} towns.`);

  writeJson(path.join(PUBLIC_DATA_DIR, 'prefectures.json'), prefectures);
  writeJson(path.join(PUBLIC_DATA_DIR, 'cities.json'), cities);
  writeJson(path.join(PUBLIC_DATA_DIR, 'towns.json'), towns);

  const designatedCities = buildDesignatedCities(cities);
  writeJson(path.join(PUBLIC_DATA_DIR, 'designated_cities.json'), designatedCities);

  console.log(
    'Written prefectures.json, cities.json, towns.json and designated_cities.json under public/data.',
  );
}

main().catch((err) => {
  console.error('Error while generating regions from Geolonia API:', err);
  process.exitCode = 1;
});

