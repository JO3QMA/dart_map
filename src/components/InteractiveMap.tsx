import { useRef, useState, useCallback } from 'react';
import type { DartPosition } from '../types';

interface InteractiveMapProps {
    isAnimating: boolean;
    onThrow: (clickX: number, clickY: number) => void;
    disabled: boolean;
}

export default function InteractiveMap({
    isAnimating,
    onThrow,
    disabled,
}: InteractiveMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [showDart, setShowDart] = useState(false);
    const [dartPos, setDartPos] = useState<DartPosition>({ x: 50, y: 100 });
    const [landed, setLanded] = useState(false);
    const [impactPos, setImpactPos] = useState<DartPosition | null>(null);

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (isAnimating || disabled || !mapRef.current) return;

            const rect = mapRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            // Reset state
            setLanded(false);
            setImpactPos(null);
            setShowDart(true);
            setDartPos({ x: 50, y: 105 }); // Start from bottom center

            // Fly to click position
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setDartPos({ x, y });
                });
            });

            // Dart landing effect
            setTimeout(() => {
                setLanded(true);
                setImpactPos({ x, y });
            }, 700);

            // Notify parent
            onThrow(x, y);

            // Clean up dart after result shows
            setTimeout(() => {
                setShowDart(false);
                setLanded(false);
                setImpactPos(null);
            }, 2000);
        },
        [isAnimating, disabled, onThrow]
    );

    return (
        <div className="relative">
            <div
                ref={mapRef}
                id="map-area"
                className="map-area"
                onClick={handleClick}
                style={{
                    cursor: disabled ? 'not-allowed' : isAnimating ? 'wait' : 'crosshair',
                    opacity: disabled ? 0.6 : 1,
                }}
            >
                {/* Japan silhouette / decorative elements */}
                <JapanBackground />

                {/* Grid overlay for a techy feel */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.06]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                    }}
                />

                {/* Center target indicator */}
                {!showDart && !isAnimating && !disabled && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="animate-pulse-glow rounded-full w-16 h-16 flex items-center justify-center">
                            <div className="text-3xl animate-bounce-subtle">🎯</div>
                        </div>
                    </div>
                )}

                {/* Instruction text */}
                {!showDart && !isAnimating && !disabled && (
                    <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                        <span className="inline-block bg-white/80 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-semibold text-gray-600 shadow-sm">
                            クリックしてダーツを投げる！
                        </span>
                    </div>
                )}

                {/* Dart element */}
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

                {/* Impact ripple */}
                {impactPos && (
                    <div
                        className="dart-impact"
                        style={{
                            left: `${impactPos.x}%`,
                            top: `${impactPos.y}%`,
                        }}
                    />
                )}

                {/* Disabled overlay */}
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

/** Decorative Japan-shaped background shapes */
function JapanBackground() {
    return (
        <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 400 300"
            preserveAspectRatio="xMidYMid meet"
        >
            <defs>
                <linearGradient id="japanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0.1" />
                </linearGradient>
            </defs>

            {/* Stylized Japan archipelago shapes */}
            {/* Hokkaido */}
            <ellipse cx="290" cy="55" rx="38" ry="28" fill="url(#japanGrad)" stroke="#93c5fd" strokeWidth="0.5" />
            {/* Honshu */}
            <path
                d="M170,80 Q200,75 240,90 Q270,100 280,130 Q275,160 260,180 Q240,200 210,210 Q180,215 160,200 Q145,185 140,160 Q138,130 150,105 Q158,88 170,80Z"
                fill="url(#japanGrad)"
                stroke="#93c5fd"
                strokeWidth="0.5"
            />
            {/* Shikoku */}
            <ellipse cx="185" cy="225" rx="28" ry="15" fill="url(#japanGrad)" stroke="#93c5fd" strokeWidth="0.5" />
            {/* Kyushu */}
            <ellipse cx="140" cy="240" rx="25" ry="30" fill="url(#japanGrad)" stroke="#93c5fd" strokeWidth="0.5" />
            {/* Okinawa */}
            <ellipse cx="105" cy="270" rx="8" ry="5" fill="url(#japanGrad)" stroke="#93c5fd" strokeWidth="0.5" />
        </svg>
    );
}
