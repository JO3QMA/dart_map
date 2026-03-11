import { Target } from 'lucide-react';

export default function Header() {
    return (
        <header className="relative overflow-hidden">
            {/* Gradient background */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 30%, #10b981 70%, #f59e0b 100%)',
                }}
            />
            {/* Decorative floating shapes */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute w-32 h-32 rounded-full opacity-15"
                    style={{
                        background: 'white',
                        top: '-1rem',
                        right: '10%',
                        filter: 'blur(2px)',
                    }}
                />
                <div
                    className="absolute w-20 h-20 rounded-full opacity-10"
                    style={{
                        background: 'white',
                        bottom: '-0.5rem',
                        left: '15%',
                        filter: 'blur(2px)',
                    }}
                />
            </div>

            <div className="relative z-10 px-4 py-5 sm:py-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-1">
                    <span className="text-3xl sm:text-4xl" role="img" aria-label="dart">
                        🎯
                    </span>
                    <h1
                        className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        ダーツの旅
                    </h1>
                    <Target className="w-6 h-6 sm:w-7 sm:h-7 text-white/80" />
                </div>
                <p className="text-sm sm:text-base text-white/85 font-medium">
                    ダーツを投げて、まだ見ぬ場所へ旅立とう！
                </p>
            </div>
        </header>
    );
}
