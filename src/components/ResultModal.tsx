import { X, MapPin, ChevronRight, ExternalLink } from "lucide-react";
import type { Region, GameMode } from "../types";
import { getGoogleMapsUrl, getNextMode } from "../services/dataService";
import { getResultShareUrl } from "../utils/shareUrl";
import ShareButtons from "./ShareButtons";

interface ResultModalProps {
  result: Region;
  parentName?: string;
  mode: GameMode;
  selectedPrefecture?: string | null;
  selectedCity?: string | null;
  onClose: () => void;
  onDrillDown: (nextMode: GameMode, parentId: string) => void;
}

export default function ResultModal({
  result,
  parentName,
  mode,
  selectedPrefecture = null,
  selectedCity = null,
  onClose,
  onDrillDown,
}: ResultModalProps) {
  const displayName = parentName ? `${parentName} ${result.name}` : result.name;

  const googleMapsUrl = getGoogleMapsUrl(result, parentName);
  const nextMode = getNextMode(mode);

  const shareText = `🎯 ダーツの旅で「${displayName}」に当たりました！ #ダーツの旅`;
  const resultShareUrl = getResultShareUrl({
    result,
    mode,
    parentName,
    selectedPrefecture,
    selectedCity,
  });

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={handleBackdropClick}
      id="result-modal-overlay"
    >
      <div className="modal-content" id="result-modal">
        {/* Close button */}
        <button
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          onClick={onClose}
          id="modal-close-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Result header */}
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🎯</div>
          <p className="text-xs font-semibold text-sky-500 uppercase tracking-wider mb-1">
            DESTINATION
          </p>
          <h2
            className="text-xl sm:text-2xl font-extrabold text-gray-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {result.name}
          </h2>
          {parentName && (
            <p className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {parentName}
            </p>
          )}
        </div>

        {/* Coordinate badge */}
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center gap-1.5 bg-gray-50 rounded-full px-2.5 py-1 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {result.coordinate.lat.toFixed(4)},{" "}
            {result.coordinate.lng.toFixed(4)}
          </span>
        </div>

        {/* Actions */}
        <div className="space-y-2 mb-4">
          {/* Google Maps button */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-emerald w-full text-sm"
            id="google-maps-btn"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Google マップで見る
          </a>

          {/* Drill down button */}
          {nextMode && (
            <button
              className="btn btn-primary w-full text-sm"
              onClick={() => onDrillDown(nextMode, result.id)}
              id="drill-down-btn"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              {result.name}内をさらに探索する
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-400 text-center mb-2">結果をシェア</p>
          <ShareButtons text={shareText} url={resultShareUrl} />
        </div>
      </div>
    </div>
  );
}
