import { useCallback, useMemo, useState } from 'react';
import {
    GeoJSON as LeafletGeoJSON,
    MapContainer,
    TileLayer,
    useMap,
    useMapEvents,
} from 'react-leaflet';
import type { GameMode, Region, DartPosition } from '../types';

export interface InteractiveMapProps {
    isAnimating: boolean;
    onThrow: (clickX: number, clickY: number) => void;
    disabled: boolean;
    mode: GameMode;
    prefectureName: string;
    cityName: string;
    result: Region | null;
    parentName?: string;
}

interface MapControllerProps {
    query: string;
    hasResult: boolean;
    isAnimating: boolean;
    disabled: boolean;
    onMapClick: (xPercent: number, yPercent: number) => void;
}

type BoundaryGeoJSON = GeoJSON.FeatureCollection;

export default function InteractiveMap({
    isAnimating,
    onThrow,
    disabled,
    mode,
    prefectureName,
    cityName,
    result,
    parentName,
}: InteractiveMapProps) {
    const [showDart, setShowDart] = useState(false);
    const [dartPos, setDartPos] = useState<DartPosition>({ x: 50, y: 100 });
    const [landed, setLanded] = useState(false);
    const [impactPos, setImpactPos] = useState<DartPosition | null>(null);

    const query = useMemo(() => {
        if (result) {
            return `${parentName || ''} ${result.name}`.trim();
        }
        if (mode === 'city') {
            return `${prefectureName} ${cityName}`.trim();
        }
        if (mode === 'prefecture') {
            return prefectureName;
        }
        return '日本';
    }, [result, parentName, mode, prefectureName, cityName]);

    const handleMapClick = useCallback(
        (x: number, y: number) => {
            if (isAnimating || disabled) return;

            const xPercent = (x / 1) * 100;
            const yPercent = (y / 1) * 100;

            setLanded(false);
            setImpactPos(null);
            setShowDart(true);
            setDartPos({ x: 50, y: 105 });

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setDartPos({ x: xPercent, y: yPercent });
                });
            });

            setTimeout(() => {
                setLanded(true);
                setImpactPos({ x: xPercent, y: yPercent });
            }, 700);

            onThrow(xPercent, yPercent);

            setTimeout(() => {
                setShowDart(false);
                setLanded(false);
                setImpactPos(null);
            }, 2000);
        },
        [disabled, isAnimating, onThrow]
    );

    return (
        <div className="relative">
            <div
                id="map-area"
                className="map-area"
                style={{
                    cursor: disabled ? 'not-allowed' : isAnimating ? 'wait' : 'crosshair',
                    opacity: disabled ? 0.6 : 1,
                }}
            >
                <MapContainer
                    center={[36.5, 137]}
                    zoom={5}
                    style={{ width: '100%', height: '100%' }}
                    zoomControl={false}
                    attributionControl
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                    />
                    <MapController
                        query={query}
                        hasResult={!!result}
                        isAnimating={isAnimating}
                        disabled={disabled}
                        onMapClick={handleMapClick}
                    />
                </MapContainer>

                {!showDart && !isAnimating && !disabled && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="animate-pulse-glow rounded-full w-16 h-16 flex items-center justify-center">
                            <div className="text-3xl animate-bounce-subtle">🎯</div>
                        </div>
                    </div>
                )}

                {!showDart && !isAnimating && !disabled && (
                    <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                        <span className="inline-block bg-white/80 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-semibold text-gray-600 shadow-sm">
                            クリックしてダーツを投げる！
                        </span>
                    </div>
                )}

                {showDart && (
                    <div
                        className={`dart ${landed ? 'animate-dart-stick' : ''}`}
                        style={{
                            left: `${dartPos.x}%`,
                            top: `${dartPos.y}%`,
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        🎯
                    </div>
                )}

                {impactPos && (
                    <div
                        className="dart-impact"
                        style={{
                            left: `${impactPos.x}%`,
                            top: `${impactPos.y}%`,
                        }}
                    />
                )}

                {disabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 rounded-2xl">
                        <span className="bg-white/90 backdrop-blur-sm rounded-full px-5 py-2 text-sm font-semibold text-gray-500 shadow">
                            エリアを選択してください
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

function MapController({ query, hasResult, isAnimating, disabled, onMapClick }: MapControllerProps) {
    const map = useMap();
    const [data, setData] = useState<BoundaryGeoJSON | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useMapEvents({
        click(e) {
            if (isAnimating || disabled) return;
            const size = map.getSize();
            const xPercent = (e.containerPoint.x / size.x) * 100;
            const yPercent = (e.containerPoint.y / size.y) * 100;
            onMapClick(xPercent, yPercent);
        },
    });

    useMemo(() => {
        let cancelled = false;

        const fetchBoundary = async () => {
            if (!query) {
                setData(null);
                setError(null);
                return;
            }

            setLoading(true);
            setError(null);
            setData(null);

            try {
                const params = new URLSearchParams({ q: query });
                const res = await fetch(`/api/boundary?${params.toString()}`);

                if (!res.ok) {
                    throw new Error(`Failed to fetch boundary: ${res.status}`);
                }

                const json = (await res.json()) as BoundaryGeoJSON;
                if (cancelled) return;

                setData(json);
            } catch (err) {
                if (cancelled) return;
                console.error(err);
                setError('境界データの取得に失敗しました');
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchBoundary();

        return () => {
            cancelled = true;
        };
    }, [query]);

    const style = useCallback(
        () => ({
            color: hasResult ? '#ef4444' : '#3b82f6',
            weight: hasResult ? 3 : 2,
            dashArray: hasResult ? undefined : '6 4',
            fillColor: hasResult ? '#ef4444' : '#3b82f6',
            fillOpacity: hasResult ? 0.1 : 0.05,
        }),
        [hasResult]
    );

    if (data) {
        return (
            <LeafletGeoJSON
                key={query}
                data={data as never}
                style={style}
                eventHandlers={{
                    add(e) {
                        const layer = e.target;
                        try {
                            const bounds = layer.getBounds();
                            if (bounds && bounds.isValid && bounds.isValid()) {
                                map.flyToBounds(bounds, { padding: [20, 20] });
                            }
                        } catch {
                            // ignore
                        }
                    },
                }}
            />
        );
    }

    if (loading || error) {
        return null;
    }

    return null;
}
