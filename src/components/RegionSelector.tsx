import { useEffect, useState } from 'react';
import { Globe, MapPin, Building2 } from 'lucide-react';
import type { GameMode, Region } from '../types';
import {
    fetchRegions,
    fetchDesignatedCities,
    mergeCitiesWithDesignated,
} from '../services/dataService';

interface RegionSelectorProps {
    mode: GameMode;
    onModeChange: (mode: GameMode) => void;
    selectedPrefecture: string | null;
    onPrefectureChange: (id: string | null) => void;
    selectedCity: string | null;
    onCityChange: (id: string | null) => void;
    mergeDesignatedCities: boolean;
    onMergeDesignatedCitiesChange: (v: boolean) => void;
}

const MODE_OPTIONS: { value: GameMode; label: string; icon: typeof Globe }[] = [
    { value: 'country', label: '日本全国', icon: Globe },
    { value: 'prefecture', label: '都道府県内', icon: MapPin },
    { value: 'city', label: '市区町村内', icon: Building2 },
];

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
    const [prefectures, setPrefectures] = useState<Region[]>([]);
    const [cities, setCities] = useState<Region[]>([]);
    const [displayCities, setDisplayCities] = useState<Region[]>([]);

    // Load prefectures
    useEffect(() => {
        fetchRegions('prefecture').then(setPrefectures);
    }, []);

    // Load cities when prefecture changes
    useEffect(() => {
        if (selectedPrefecture) {
            fetchRegions('city', selectedPrefecture).then(setCities);
        } else {
            setCities([]);
        }
    }, [selectedPrefecture]);

    // Build displayCities depending on mergeDesignatedCities toggle
    useEffect(() => {
        if (!selectedPrefecture) {
            setDisplayCities([]);
            return;
        }

        if (!mergeDesignatedCities) {
            setDisplayCities(cities);
            return;
        }

        let cancelled = false;

        (async () => {
            const designated = await fetchDesignatedCities(selectedPrefecture);
            if (cancelled) return;

            const merged = mergeCitiesWithDesignated(cities, designated);
            setDisplayCities(merged);
        })();

        return () => {
            cancelled = true;
        };
    }, [cities, mergeDesignatedCities, selectedPrefecture]);

    // Reset selections when mode changes
    const handleModeChange = (newMode: GameMode) => {
        onModeChange(newMode);
        if (newMode === 'country') {
            onPrefectureChange(null);
            onCityChange(null);
        }
        if (newMode === 'prefecture') {
            onCityChange(null);
        }
    };

    return (
        <div className="glass-card p-4 sm:p-6">
            {/* Mode buttons */}
            <div className="mb-5">
                <p className="mb-3 text-sm font-semibold text-gray-600">
                    🗺️ エリアモードを選択
                </p>
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

            {/* Prefecture selector */}
            {(mode === 'prefecture' || mode === 'city') && (
                <div className="animate-fade-in flex flex-wrap items-center gap-3">
                    <label className="text-sm font-semibold text-gray-600">
                        📍 都道府県
                    </label>
                    <select
                        id="prefecture-select"
                        className="select-styled"
                        value={selectedPrefecture || ''}
                        onChange={(e) => {
                            onPrefectureChange(e.target.value || null);
                            onCityChange(null);
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
            )}

            {/* Designated city toggle & city selector */}
            {selectedPrefecture && (mode === 'prefecture' || mode === 'city') && (
                <div className="animate-fade-in mt-4 flex flex-col gap-3">
                    <label className="flex cursor-pointer select-none items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm text-gray-600">
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
                            <label className="text-sm font-semibold text-gray-600">
                                🏙️ 市区町村
                            </label>
                            <select
                                id="city-select"
                                className="select-styled"
                                value={selectedCity || ''}
                                onChange={(e) => onCityChange(e.target.value || null)}
                            >
                                <option value="">選択してください</option>
                                {displayCities.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* Instruction */}
            <div className="mt-5 border-t border-slate-200/70 pt-4">
                <p className="flex items-center gap-1 text-xs text-gray-400">
                    <span>👆</span>
                    {mode === 'country'
                        ? '下の地図エリアをクリックしてダーツを投げよう！'
                        : selectedPrefecture
                            ? '準備OK！地図エリアをクリックしてダーツを投げよう！'
                            : 'まず都道府県を選択してください'}
                </p>
            </div>
        </div>
    );
}
