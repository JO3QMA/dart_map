import { useEffect, useState } from 'react'
import { Globe, MapPin, Building2 } from 'lucide-react'
import type { GameMode, Region } from '../types'
import { fetchRegions } from '../services/dataService'

interface RegionSelectorProps {
  mode: GameMode
  onModeChange: (mode: GameMode) => void
  selectedPrefecture: string | null
  onPrefectureChange: (id: string | null) => void
  selectedCity: string | null
  onCityChange: (id: string | null) => void
  mergeDesignatedCities: boolean
  onMergeDesignatedCitiesChange: (v: boolean) => void
}

const MODE_OPTIONS: { value: GameMode; label: string; icon: typeof Globe }[] = [
  { value: 'country', label: '日本全国', icon: Globe },
  { value: 'prefecture', label: '都道府県内', icon: MapPin },
  { value: 'city', label: '市区町村内', icon: Building2 },
]

export default function RegionSelector({
  mode,
  onModeChange,
  selectedPrefecture,
  onPrefectureChange,
  selectedCity,
  onCityChange,
  mergeDesignatedCities,
  onMergeDesignatedCitiesChange,
}: RegionSelectorProps) {
  const [prefectures, setPrefectures] = useState<Region[]>([])
  const [cities, setCities] = useState<Region[]>([])

  useEffect(() => {
    fetchRegions('prefecture').then(setPrefectures)
  }, [])

  useEffect(() => {
    if (selectedPrefecture) {
      fetchRegions('city', selectedPrefecture, mergeDesignatedCities).then(setCities)
    } else {
      setCities([])
    }
  }, [selectedPrefecture, mergeDesignatedCities])

  const handleModeChange = (newMode: GameMode) => {
    onModeChange(newMode)
    if (newMode === 'country') {
      onPrefectureChange(null)
      onCityChange(null)
    }
    if (newMode === 'prefecture') {
      onCityChange(null)
    }
  }

  return (
    <div className="glass-card glass-card-floating flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-5">
      <div className="mb-4 sm:mb-5">
        <p className="mb-3 text-sm font-semibold text-gray-600">🗺️ エリアモードを選択</p>
        <div className="segmented-control">
          {MODE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              id={`mode-btn-${value}`}
              className={`seg-btn ${mode === value ? 'active' : ''}`}
              onClick={() => handleModeChange(value)}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {(mode === 'prefecture' || mode === 'city') && (
        <div className="animate-fade-in flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-gray-600">📍 都道府県</label>
            <select
              id="prefecture-select"
              className="select-styled"
              value={selectedPrefecture || ''}
              onChange={(e) => {
                onPrefectureChange(e.target.value || null)
                onCityChange(null)
              }}
            >
              <option value="">選択してください</option>
              {prefectures.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {selectedPrefecture && (
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer select-none items-center gap-2 px-1 py-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={mergeDesignatedCities}
                  onChange={(e) => onMergeDesignatedCitiesChange(e.target.checked)}
                  className="w-4 h-4"
                />
                政令指定都市の区をまとめる
              </label>

              {mode === 'city' && (
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-sm font-semibold text-gray-600">🏙️ 市区町村</label>
                  <select
                    id="city-select"
                    className="select-styled"
                    value={selectedCity || ''}
                    onChange={(e) => onCityChange(e.target.value || null)}
                  >
                    <option value="">選択してください</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-200/70 pt-3 pb-3 sm:pt-4 sm:pb-4">
        <p className="flex items-center gap-1 text-xs text-gray-600">
          <span>👆</span>
          {mode === 'country'
            ? '下の地図エリアをクリックしてダーツを投げよう！'
            : selectedPrefecture
              ? '準備OK！地図エリアをクリックしてダーツを投げよう！'
              : 'まず都道府県を選択してください'}
        </p>
      </div>
    </div>
  )
}
