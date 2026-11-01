'use client';

import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { ja } from '@/lib/i18n/ja';

interface ZoomControlsProps {
  zoomPercent: number;
  onZoomChange: (newZoom: number) => void;
  onResetZoom: () => void;
}

export function ZoomControls({
  zoomPercent,
  onZoomChange,
  onResetZoom,
}: ZoomControlsProps) {
  const handleZoomOut = () => {
    onZoomChange(Math.max(25, zoomPercent - 15));
  };

  const handleZoomIn = () => {
    onZoomChange(Math.min(150, zoomPercent + 15));
  };

  return (
    <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-1.5 rounded-2xl border border-gray-200/80 shadow-xs select-none touch-manipulation">
      <button
        type="button"
        onClick={handleZoomOut}
        disabled={zoomPercent <= 25}
        className="p-1.5 rounded-xl text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors"
        aria-label={ja.common.zoomOut}
        title={ja.common.zoomOut}
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <span
        className="px-2 py-1 rounded-lg text-xs font-semibold text-gray-700 min-h-[38px] flex items-center justify-center font-mono cursor-default"
      >
        {Math.round(zoomPercent)}%
      </span>

      <button
        type="button"
        onClick={handleZoomIn}
        disabled={zoomPercent >= 150}
        className="p-1.5 rounded-xl text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors"
        aria-label={ja.common.zoomIn}
        title={ja.common.zoomIn}
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <div className="h-4 w-px bg-gray-200 mx-0.5" />

      <button
        type="button"
        onClick={onResetZoom}
        className="px-2 py-1 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 active:bg-gray-200 flex items-center gap-1 min-h-[38px] transition-colors"
        aria-label={ja.common.zoomReset}
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{ja.common.zoomReset}</span>
      </button>
    </div>
  );
}
