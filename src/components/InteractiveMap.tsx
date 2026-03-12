import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    GeoJSON as LeafletGeoJSON,
    MapContainer,
    Marker,
    TileLayer,
    useMap,
    useMapEvents,
} from 'react-leaflet';
import L, { type LeafletMouseEvent, type LayerEvent } from 'leaflet';
import type { FeatureCollection } from 'geojson';
import type { GameMode, Region } from '../types';

// Leaflet のデフォルトマーカー画像参照先を CDN に変更し、ローカルの /marker-*.png へのフォールバックを防ぐ
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
    onMapClick: (xPercent: number, yPercent: number, point: { x: number; y: number }) => void;
    result: Region | null;
    mode: GameMode;
    prefectureName: string;
}

type BoundaryGeoJSON = FeatureCollection;

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
    const mapAreaRef = useRef<HTMLDivElement | null>(null);
    const dartIcon = useMemo(
        () =>
            L.divIcon({
                html: '<span style="font-size: 24px;">🎯</span>',
                className: 'leaflet-div-icon dart-marker',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
            }),
        []
    );
    const query = useMemo(() => {
        // 都道府県モードでは、抽選結果があっても常に選択中の都道府県名で境界を取得する
        // これにより、他の都道府県の境界線が表示されるのを防ぐ
        if (mode === 'prefecture') {
            return prefectureName;
        }

        if (mode === 'city') {
            if (result) {
                // 市区町村モードでは、親(都道府県など) + 結果名でより精度の高い境界を取得する
                return `${parentName || prefectureName} ${result.name}`.trim();
            }
            return `${prefectureName} ${cityName}`.trim();
        }

        if (result) {
            return `${parentName || ''} ${result.name}`.trim();
        }

        return '日本';
    }, [result, parentName, mode, prefectureName, cityName]);

    const handleMapClick = useCallback(
        (xPercent: number, yPercent: number, point: { x: number; y: number }) => {
            if (isAnimating || disabled) return;

            const mapArea = mapAreaRef.current;
            if (mapArea) {
                const ripple = document.createElement('div');
                ripple.className = 'dart-impact';
                ripple.style.left = `${point.x}px`;
                ripple.style.top = `${point.y}px`;
                mapArea.appendChild(ripple);
                window.setTimeout(() => ripple.remove(), 800);
            }

            onThrow(xPercent, yPercent);
        },
        [disabled, isAnimating, onThrow]
    );

    return (
        <div className="relative">
            <div
                id="map-area"
                className="map-area"
                ref={mapAreaRef}
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
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    {result && (
                        <Marker
                            position={[result.coordinate.lat, result.coordinate.lng]}
                            icon={dartIcon}
                            zIndexOffset={1000}
                        />
                    )}
                    <MapController
                        query={query}
                        hasResult={!!result}
                        isAnimating={isAnimating}
                        disabled={disabled}
                        onMapClick={handleMapClick}
                        result={result}
                        mode={mode}
                        prefectureName={prefectureName}
                    />
                </MapContainer>

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
    mode,
    prefectureName,
}: MapControllerProps) {
    const map = useMap();
    const [data, setData] = useState<BoundaryGeoJSON | null>(null);
    const [cityBoundary, setCityBoundary] = useState<BoundaryGeoJSON | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useMapEvents({
        click(e: LeafletMouseEvent) {
            if (isAnimating || disabled) return;
            const size = map.getSize();
            const xPercent = (e.containerPoint.x / size.x) * 100;
            const yPercent = (e.containerPoint.y / size.y) * 100;
            onMapClick(xPercent, yPercent, {
                x: e.containerPoint.x,
                y: e.containerPoint.y,
            });
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

                // 先頭フィーチャのみに絞り込み、余分な境界線が描画されるのを防ぐ
                const filtered: BoundaryGeoJSON =
                    json.features?.length > 1
                        ? { ...json, features: [json.features[0]] }
                        : json;

                setData(filtered);
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

    // 都道府県モードで市区町村が当選した場合、その市区町村の境界も別レイヤーで取得・表示
    useEffect(() => {
        let cancelled = false;

        const fetchCityBoundary = async () => {
            if (!result || mode !== 'prefecture') {
                setCityBoundary(null);
                return;
            }

            const cityQuery = `${prefectureName} ${result.name}`.trim();
            if (!cityQuery) {
                setCityBoundary(null);
                return;
            }

            try {
                const params = new URLSearchParams({ q: cityQuery });
                const res = await fetch(`/api/boundary?${params.toString()}`);

                if (!res.ok) {
                    throw new Error(`Failed to fetch city boundary: ${res.status}`);
                }

                const json = (await res.json()) as BoundaryGeoJSON;
                if (cancelled) return;

                const filtered: BoundaryGeoJSON =
                    json.features?.length > 1
                        ? { ...json, features: [json.features[0]] }
                        : json;

                setCityBoundary(filtered);
            } catch (err) {
                if (cancelled) return;
                console.error(err);
            }
        };

        fetchCityBoundary();

        return () => {
            cancelled = true;
        };
    }, [mode, prefectureName, result]);

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

    const cityStyle = useCallback(
        () => ({
            color: '#22c55e',
            weight: 3,
            dashArray: undefined,
            fillColor: '#22c55e',
            fillOpacity: 0.08,
        }),
        []
    );

    // GeoJSON 内の Point をデフォルトマーカーではなく不可視のサークルとして描画し、
    // 青いデフォルトマーカーが重複表示されるのを防ぐ
    const pointToLayer = useCallback(
        (_feature: GeoJSON.Feature, latlng: L.LatLng) =>
            L.circleMarker(latlng, {
                radius: 0,
                opacity: 0,
                fillOpacity: 0,
            }),
        []
    );


    if (loading || error) {
        return null;
    }

    const showBaseBoundary =
        !(mode === 'prefecture' && result && cityBoundary);

    return (
        <>
            {showBaseBoundary && data && (
                <LeafletGeoJSON
                    key={JSON.stringify(data)}
                    data={data as never}
                    style={style}
                    pointToLayer={pointToLayer as never}
                    eventHandlers={{
                        add(e: LayerEvent) {
                            const layer = e.target as L.GeoJSON;
                            try {
                                const bounds = layer.getBounds();
                                if (bounds && bounds.isValid && bounds.isValid()) {
                                    map.flyToBounds(bounds, { padding: [60, 60] });
                                }
                            } catch {
                                // ignore
                            }
                        },
                    }}
                />
            )}
            {cityBoundary && (
                <LeafletGeoJSON
                    key={JSON.stringify(cityBoundary)}
                    data={cityBoundary as never}
                    style={cityStyle}
                    pointToLayer={pointToLayer as never}
                />
            )}
        </>
    );
}
