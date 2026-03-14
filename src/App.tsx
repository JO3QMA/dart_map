import { useState, useCallback, useEffect } from 'react';
import type { Region, GameMode } from './types';
import { fetchRandomTarget, fetchRegions } from './services/dataService';
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

    const [prefectureName, setPrefectureName] = useState<string>('');
    const [cityName, setCityName] = useState<string>('');

    useEffect(() => {
        if (selectedPrefecture) {
            fetchRegions('prefecture').then((regions) => {
                const found = regions.find((r) => r.id === selectedPrefecture);
                setPrefectureName(found?.name ?? '');
            });
        } else {
            setPrefectureName('');
        }
    }, [selectedPrefecture]);

    useEffect(() => {
        if (selectedCity && selectedPrefecture) {
            if (selectedCity.startsWith('DC-')) {
                const parts = selectedCity.split('-').slice(2);
                setCityName(parts.join('-') ?? '');
                return;
            }
            fetchRegions('city', selectedPrefecture).then((regions) => {
                const found = regions.find((r) => r.id === selectedCity);
                setCityName(found?.name ?? '');
            });
        } else {
            setCityName('');
        }
    }, [selectedCity, selectedPrefecture]);

    const getParentId = useCallback((): string | undefined => {
        switch (mode) {
            case 'country':
                return undefined;
            case 'prefecture':
                return selectedPrefecture ?? undefined;
            case 'city':
                return selectedCity ?? undefined;
        }
    }, [mode, selectedPrefecture, selectedCity]);

    const isMapDisabled =
        (mode === 'prefecture' && !selectedPrefecture) ||
        (mode === 'city' && (!selectedPrefecture || !selectedCity));

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
                const parentId = getParentId();
                const selected = await fetchRandomTarget(
                    mode,
                    parentId,
                    mergeDesignatedCities,
                );

                let parentForResult: string | undefined = resolveParentName();
                if (
                    mode === 'city' &&
                    selected.type === 'town' &&
                    selected.parentId &&
                    selectedPrefecture
                ) {
                    const cities = await fetchRegions('city', selectedPrefecture);
                    const ward = cities.find((c) => c.id === selected.parentId);
                    if (ward) parentForResult = ward.name;
                }

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
            selectedPrefecture,
            mergeDesignatedCities,
        ],
    );

    const handleDrillDown = useCallback(
        (nextMode: GameMode, parentId: string) => {
            setShowModal(false);
            setResult(null);

            if (nextMode === 'prefecture') {
                setMode('prefecture');
                setSelectedPrefecture(parentId);
                setSelectedCity(null);
            } else if (nextMode === 'city') {
                setMode('city');
                setSelectedCity(parentId);
            }
        },
        [],
    );

    const handleCloseModal = useCallback(() => {
        setShowModal(false);
    }, []);

    return (
        <div className="app-root">
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

            <footer className="pointer-events-none fixed bottom-0 left-0 w-full z-[1000] bg-white/75 backdrop-blur-md px-4 py-1.5">
                <div className="pointer-events-auto flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                    <span>© 2026 ダーツの旅 — バーチャル旅行アプリ</span>
                    <span>·</span>
                    <a
                        href="https://leafletjs.com"
                        title="A JavaScript library for interactive maps"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-gray-700"
                    >
                        <svg
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="8"
                            viewBox="0 0 12 8"
                        >
                            <path fill="#4C7BE1" d="M0 0h12v4H0z" />
                            <path fill="#FFD500" d="M0 4h12v3H0z" />
                            <path fill="#E0BC00" d="M0 7h12v1H0z" />
                        </svg>
                        <span>Leaflet</span>
                    </a>
                    <span>·</span>
                    <a
                        href="https://www.openstreetmap.org/copyright"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-gray-700"
                    >
                        © OpenStreetMap contributors
                    </a>
                    <span>·</span>
                    <a
                        href="https://carto.com/attributions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-gray-700"
                    >
                        © CARTO
                    </a>
                    <span>·</span>
                    <a
                        href="https://creativecommons.org/licenses/by/4.0/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-gray-700"
                    >
                        Geolonia 住所データ
                    </a>
                </div>
            </footer>

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
