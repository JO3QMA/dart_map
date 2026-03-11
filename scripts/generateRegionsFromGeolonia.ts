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

// --- 町丁目 JSON から市区町村代表点を計算 ---

async function fetchCityPoint(prefName: string, cityName: string): Promise<CityPoint | null> {
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

    if (!rows.length) return null;

    let latSum = 0;
    let lngSum = 0;
    let count = 0;

    for (const r of rows) {
      if (typeof r.lat === 'number' && typeof r.lng === 'number') {
        latSum += r.lat;
        lngSum += r.lng;
        count += 1;
      }
    }

    if (!count) return null;

    return {
      lat: latSum / count,
      lng: lngSum / count,
    };
  } catch (e) {
    console.error(`Failed to fetch city data for ${prefName} / ${cityName}:`, e);
    return null;
  }
}

// --- 都道府県・市区町村 Region を生成 ---

async function buildRegionsFromApi(): Promise<{ prefectures: Region[]; cities: Region[] }> {
  console.log('Fetching ja.json ...');
  const ja = await fetchJson<JaJson>(JA_JSON_URL);

  const prefectureNames = Object.keys(ja);
  console.log(`Found ${prefectureNames.length} prefectures in ja.json.`);

  const prefectures: Region[] = [];
  const cities: Region[] = [];

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

      const point = await fetchCityPoint(prefName, cityName);
      if (!point) {
        console.warn(`  [skip] no point for city: ${prefName} / ${cityName}`);
        continue;
      }

      cities.push({
        id: cityId,
        type: 'city' as RegionType,
        name: cityName,
        coordinate: point,
        parentId: prefId,
      });

      cityPoints.push(point);
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

  return { prefectures, cities };
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
  const { prefectures, cities } = await buildRegionsFromApi();

  console.log(`Built ${prefectures.length} prefectures and ${cities.length} cities.`);

  const publicDataDir = path.resolve(process.cwd(), 'public', 'data');
  writeJson(path.join(publicDataDir, 'prefectures.json'), prefectures);
  writeJson(path.join(publicDataDir, 'cities.json'), cities);

  console.log('Written prefectures.json and cities.json under public/data.');
}

main().catch((err) => {
  console.error('Error while generating regions from Geolonia API:', err);
  process.exitCode = 1;
});

