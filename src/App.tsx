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
                return cityName
                    ? `${prefectureName} ${cityName}`
                    : prefectureName || undefined;
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
                const selected = await fetchRandomTarget(mode, parentId);

                // Wait for dart to land before showing result
                setTimeout(() => {
                    setResult(selected);
                    setParentName(resolveParentName());
                    setShowModal(true);
                    setIsAnimating(false);
                }, 800);
            } catch (error) {
                console.error('Failed to fetch target:', error);
                setIsAnimating(false);
            }
        },
        [isAnimating, mode, getParentId, resolveParentName]
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
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 px-4 py-6 sm:py-8 max-w-2xl mx-auto w-full space-y-6">
                <RegionSelector
                    mode={mode}
                    onModeChange={setMode}
                    selectedPrefecture={selectedPrefecture}
                    onPrefectureChange={setSelectedPrefecture}
                    selectedCity={selectedCity}
                    onCityChange={setSelectedCity}
                />

                <InteractiveMap
                    isAnimating={isAnimating}
                    onThrow={handleThrow}
                    disabled={isMapDisabled}
                />

                {/* Footer attribution */}
                <footer className="text-center pt-4">
                    <p className="text-xs text-gray-400">
                        © 2026 ダーツの旅 — バーチャル旅行アプリ
                    </p>
                </footer>
            </main>

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
