import { ExternalLink, ChevronRight } from "lucide-react";
import type { Region, GameMode } from "../types";
import { getGoogleMapsUrl, getNextMode } from "../services/dataService";

interface ResultBarProps {
  result: Region;
  parentName?: string;
  mode: GameMode;
  onDrillDown: (nextMode: GameMode, parentId: string) => void;
}

export default function ResultBar({
  result,
  parentName,
  mode,
  onDrillDown,
}: ResultBarProps) {
  const displayName = parentName ? `${parentName} ${result.name}` : result.name;
  const googleMapsUrl = getGoogleMapsUrl(result, parentName);
  const nextMode = getNextMode(mode);

  return (
    <div
      className="pointer-events-auto fixed bottom-10 left-0 right-0 z-[999] mx-3 mb-1 sm:left-auto sm:right-5 sm:bottom-10 sm:mx-0 sm:mb-1 sm:max-w-sm"
      role="region"
      aria-label="抽選結果"
    >
      <div className="rounded-xl border border-gray-200/80 bg-white/95 shadow-lg backdrop-blur-md px-4 py-3.5 flex flex-col gap-3">
        <p
          className="text-sm font-semibold text-gray-900 truncate"
          title={displayName}
          style={{ fontFamily: "var(--font-display)" }}
        >
          🎯 {displayName}
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-emerald text-sm inline-flex items-center gap-1.5 flex-1 sm:flex-initial"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            Googleマップ
          </a>
          {nextMode && (
            <button
              type="button"
              className="btn btn-primary text-sm inline-flex items-center gap-1.5 flex-1 sm:flex-initial"
              onClick={() => onDrillDown(nextMode, result.id)}
            >
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              下位を探索
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
