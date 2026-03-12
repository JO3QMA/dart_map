import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    GeoJSON as LeafletGeoJSON,
    MapContainer,
    Marker,
    TileLayer,
    useMap,
    useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
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
    result: Region | null;
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
        (xPercent: number, yPercent: number) => {
            if (isAnimating || disabled) return;

            onThrow(xPercent, yPercent);
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
                        result={result}
                    />
                </MapContainer>

                {!isAnimating && !disabled && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="animate-pulse-glow rounded-full w-16 h-16 flex items-center justify-center">
                            <div className="text-3xl animate-bounce-subtle">🎯</div>
                        </div>
                    </div>
                )}

                {!isAnimating && !disabled && (
                    <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                        <span className="inline-block bg-white/80 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-semibold text-gray-600 shadow-sm">
                            クリックしてダーツを投げる！
                        </span>
                    </div>
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

function MapController({
    query,
    hasResult,
    isAnimating,
    disabled,
    onMapClick,
    result,
}: MapControllerProps) {
    const map = useMap();
    const [data, setData] = useState<BoundaryGeoJSON | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const dartIcon = useMemo(
        () =>
            L.divIcon({
                html: '🎯',
                className: '',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
            }),
        []
    );

    useMapEvents({
        click(e) {
            if (isAnimating || disabled) return;
            const size = map.getSize();
            const xPercent = (e.containerPoint.x / size.x) * 100;
            const yPercent = (e.containerPoint.y / size.y) * 100;
            onMapClick(xPercent, yPercent);
        },
    });

    useEffect(() => {
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

    // 抽選結果が確定したら、その地点へマップを移動
    useEffect(() => {
        if (!result) return;
        const { lat, lng } = result.coordinate;
        const currentZoom = map.getZoom();
        const targetZoom = Math.max(currentZoom, 9);
        map.flyTo([lat, lng], targetZoom, { duration: 1.2 });
    }, [map, result]);

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

    if (loading || error) {
        return null;
    }

    return (
        <>
            {data && (
                <LeafletGeoJSON
                    key={JSON.stringify(data)}
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
            )}
            {result && (
                <Marker
                    position={[result.coordinate.lat, result.coordinate.lng]}
                    icon={dartIcon}
                />
            )}
        </>
    );
}
