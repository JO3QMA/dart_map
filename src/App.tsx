import { useState, useCallback, useEffect } from 'react';
import type { Region, GameMode } from './types';
import {
    fetchRandomTarget,
    fetchRegions,
    fetchRandomTargetFromDesignatedCity,
    getWardIdsForDesignatedCity,
    fetchDesignatedCities,
    mergeCitiesWithDesignated,
    pickRandom,
} from './services/dataService';
import Header from './components/Header';
import RegionSelector from './components/RegionSelector';
import InteractiveMap from './components/InteractiveMap';
import ResultModal from './components/ResultModal';

export default function App() {
    const [mode, setMode] = useState<GameMode>('country');
    const [selectedPrefecture, setSelectedPrefecture] = useState<string | null>(null);
    const [selectedCity, setSelectedCity] = useState<string | null>(null);
    const [result, setResult] = useState<Region | null>(null);
    const [parentName, setParentName] = useState<string | undefined>(undefined);
    const [isAnimating, setIsAnimating] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const [mergeDesignatedCities, setMergeDesignatedCities] = useState<boolean>(false);

    // Resolve the parent name for display
    const [prefectureName, setPrefectureName] = useState<string>('');
    const [cityName, setCityName] = useState<string>('');

    useEffect(() => {
        if (selectedPrefecture) {
            fetchRegions('prefecture').then((regions) => {
                const found = regions.find((r) => r.id === selectedPrefecture);
                setPrefectureName(found?.name || '');
            });
        } else {
            setPrefectureName('');
        }
    }, [selectedPrefecture]);

    useEffect(() => {
        if (selectedCity && selectedPrefecture) {
            if (selectedCity.startsWith('DC-')) {
                const parts = selectedCity.split('-').slice(2);
                const name = parts.join('-');
                setCityName(name || '');
                return;
            }

            fetchRegions('city', selectedPrefecture).then((regions) => {
                const found = regions.find((r) => r.id === selectedCity);
                setCityName(found?.name || '');
            });
        } else {
            setCityName('');
        }
    }, [selectedCity, selectedPrefecture]);

    // Determine the parentId for data fetching
    const getParentId = useCallback((): string | undefined => {
        switch (mode) {
            case 'country':
                return undefined;
            case 'prefecture':
                return selectedPrefecture || undefined;
            case 'city':
                return selectedCity || undefined;
        }
    }, [mode, selectedPrefecture, selectedCity]);

    // Determine if the map should be interactive
    const isMapDisabled =
        (mode === 'prefecture' && !selectedPrefecture) ||
        (mode === 'city' && (!selectedPrefecture || !selectedCity));

    // Build parent name for the result
    const resolveParentName = useCallback((): string | undefined => {
        switch (mode) {
            case 'country':
                return undefined;
            case 'prefecture':
                return prefectureName || undefined;
            case 'city':
                return cityName || undefined;
        }
    }, [mode, prefectureName, cityName]);

    const handleThrow = useCallback(
        async (_x: number, _y: number) => {
            if (isAnimating) return;

            setResult(null);
            setShowModal(false);
            setIsAnimating(true);

            try {
                let selected: Region;
                let parentForResult: string | undefined = resolveParentName();

                if (
                    mode === 'city' &&
                    selectedCity &&
                    selectedCity.startsWith('DC-') &&
                    selectedPrefecture
                ) {
                    // 市区町村内モードで政令指定都市をまとめている場合は、
                    // ランダムに選ばれた町に対応する「区・市」の名前を親として表示する
                    const allCities = await fetchRegions('city', selectedPrefecture);
                    const wardIds = getWardIdsForDesignatedCity(selectedCity, allCities);
                    selected = await fetchRandomTargetFromDesignatedCity(wardIds);

                    const ward = allCities.find((c) => c.id === selected.parentId);
                    if (ward) {
                        parentForResult = ward.name;
                    }
                } else if (mode === 'prefecture' && mergeDesignatedCities && selectedPrefecture) {
                    const [cities, designated] = await Promise.all([
                        fetchRegions('city', selectedPrefecture),
                        fetchDesignatedCities(selectedPrefecture),
                    ]);

                    const merged = mergeCitiesWithDesignated(cities, designated);
                    if (!merged.length) {
                        throw new Error(
                            `No cities found for prefecture=${selectedPrefecture} (merged view)`,
                        );
                    }

                    selected = pickRandom(merged);
                } else {
                    const parentId = getParentId();
                    selected = await fetchRandomTarget(mode, parentId);
                }

                // Wait for dart to land before showing result
                setTimeout(() => {
                    setResult(selected);
                    setParentName(parentForResult);
                    setShowModal(true);
                    setIsAnimating(false);
                }, 800);
            } catch (error) {
                console.error('Failed to fetch target:', error);
                setIsAnimating(false);
            }
        },
        [
            isAnimating,
            mode,
            getParentId,
            resolveParentName,
            selectedCity,
            selectedPrefecture,
            mergeDesignatedCities,
        ]
    );

    const handleDrillDown = useCallback(
        (nextMode: GameMode, parentId: string) => {
            setShowModal(false);
            setResult(null);

            if (nextMode === 'prefecture') {
                // Drilling from country → prefecture level
                setMode('prefecture');
                setSelectedPrefecture(parentId);
                setSelectedCity(null);
            } else if (nextMode === 'city') {
                // Drilling from prefecture → city level
                setMode('city');
                setSelectedCity(parentId);
            }
        },
        []
    );

    const handleCloseModal = useCallback(() => {
        setShowModal(false);
    }, []);

    return (
        <div className="app-root">
            {/* 地図レイヤー（全画面・最下層） */}
            <div className="map-layer">
                <InteractiveMap
                    isAnimating={isAnimating}
                    onThrow={handleThrow}
                    disabled={isMapDisabled}
                    mode={mode}
                    prefectureName={prefectureName}
                    cityName={cityName}
                    result={result}
                    parentName={parentName}
                />
            </div>

            <Header />

            {/* 操作パネル（地図上にオーバーレイ） */}
            <div className="floating-panel">
                <RegionSelector
                    mode={mode}
                    onModeChange={setMode}
                    selectedPrefecture={selectedPrefecture}
                    onPrefectureChange={setSelectedPrefecture}
                    selectedCity={selectedCity}
                    onCityChange={setSelectedCity}
                    mergeDesignatedCities={mergeDesignatedCities}
                    onMergeDesignatedCitiesChange={setMergeDesignatedCities}
                />
            </div>

            {/* フッター（ライセンス・コピーライト） */}
            <footer className="app-footer">
                <p className="text-center">
                    © 2026 ダーツの旅 — バーチャル旅行アプリ
                    {' · '}
                    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
                        © OpenStreetMap
                    </a>
                    {' · '}
                    <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
                        Geolonia 住所データ（CC BY 4.0）
                    </a>
                </p>
            </footer>

            {/* Result Modal */}
            {showModal && result && (
                <ResultModal
                    result={result}
                    parentName={parentName}
                    mode={mode}
                    onClose={handleCloseModal}
                    onDrillDown={handleDrillDown}
                />
            )}
        </div>
    );
}
