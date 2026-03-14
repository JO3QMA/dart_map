import type { Region } from '../models/Region';

/** 政令指定都市の名称リスト（区をまとめる際の判定に使用） */
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

export function isDesignatedCityId(id: string): boolean {
  return id.startsWith('DC-');
}

/**
 * 政令指定都市の集約ID (DC-{prefId}-{cityName}) から、
 * 区を絞り込むための name プレフィックス（市名）を返す。
 * 例: getWardFilter('DC-13-東京都') => '東京都'
 */
export function getWardFilter(designatedCityId: string): string | null {
  if (!isDesignatedCityId(designatedCityId)) return null;
  const parts = designatedCityId.split('-').slice(2);
  const cityName = parts.join('-');
  return DESIGNATED_CITY_NAMES.includes(cityName) ? cityName : null;
}

/**
 * 市区町村リストに政令指定都市の集約レコードを適用し、
 * 区を除いて集約市1件にまとめたリストを返す。
 */
export function mergeCitiesWithDesignated(
  cities: Region[],
  designated: Region[],
): Region[] {
  if (designated.length === 0) return cities;

  const prefixes = designated.map((d) => d.name);

  const filteredCities = cities.filter((c) => {
    return !prefixes.some((p) => c.name.startsWith(p) && c.name !== p);
  });

  return [...filteredCities, ...designated].sort((a, b) =>
    a.name.localeCompare(b.name, 'ja'),
  );
}
