import { Target } from 'lucide-react';

export default function Header() {
    return (
        <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/92 backdrop-blur-xl">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex items-center gap-3">
                    <span className="text-3xl sm:text-4xl" role="img" aria-label="dart">
                        🎯
                    </span>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1
                                className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                ダーツの旅
                            </h1>
                            <Target className="h-5 w-5 text-white/70 sm:h-6 sm:w-6" />
                        </div>
                        <p className="text-sm font-medium text-slate-300 sm:text-base">
                            ダーツを投げて、まだ見ぬ場所へ旅立とう！
                        </p>
                    </div>
                </div>

                <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold tracking-[0.24em] text-slate-300 sm:block">
                    RANDOM TRIP
                </div>
            </div>
        </header>
    );
}
