'use client';

import React, { useRef } from 'react';
import { SheetModel } from '@/lib/sheet';
import { ShiftSheetPage } from './ShiftSheetPage';

interface ShiftSheetPreviewProps {
  model: SheetModel;
  zoomPercent: number;
  onZoomChange?: (newZoom: number) => void;
  onRowClick?: (employeeId?: number, rowNumber?: number) => void;
  isPrint?: boolean;
}

export function ShiftSheetPreview({
  model,
  zoomPercent,
  onZoomChange,
  onRowClick,
  isPrint = false,
}: ShiftSheetPreviewProps) {
  const scale = zoomPercent / 100;
  const initialTouchDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(zoomPercent);

  if (isPrint) {
    return (
      <div className="sheet-print-container">
        {model.pages.map((page) => (
          <ShiftSheetPage
            key={page.pageNumber}
            page={page}
            onRowClick={onRowClick}
            isPrint={true}
          />
        ))}
      </div>
    );
  }

  // Ctrl/Cmd + wheel zoom: allow zoom-out only (deltaY > 0)
  const handleWheel = (e: React.WheelEvent) => {
    if ((e.ctrlKey || e.metaKey) && onZoomChange) {
      e.preventDefault();
      // deltaY > 0 is scroll down (zoom out); disallow zoom in
      if (e.deltaY > 0) {
        onZoomChange(Math.max(25, zoomPercent - 10));
      }
    }
  };

  // Pinch-to-zoom on touch screens: allow zoom-out only
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchDistanceRef.current = dist;
      initialZoomRef.current = zoomPercent;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialTouchDistanceRef.current && onZoomChange) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialTouchDistanceRef.current;
      // Only allow zoom out (ratio < 1)
      if (ratio < 1) {
        const newZoom = Math.max(25, Math.min(initialZoomRef.current, Math.round(initialZoomRef.current * ratio)));
        onZoomChange(newZoom);
      }
    }
  };

  const handleTouchEnd = () => {
    initialTouchDistanceRef.current = null;
  };

  return (
    <div
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="sheet-preview-viewport w-full flex flex-col items-center py-4 px-2 overflow-auto"
    >
      <div className="flex flex-col items-center gap-6">
        {model.pages.map((page) => (
          <div
            key={page.pageNumber}
            className="sheet-page-wrapper transition-transform duration-75 ease-out"
            style={{
              width: `calc(297mm * ${scale})`,
              height: `calc(210mm * ${scale})`,
              position: 'relative',
            }}
          >
            <div
              style={{
                width: '297mm',
                height: '210mm',
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            >
              <ShiftSheetPage
                page={page}
                onRowClick={onRowClick}
                isPrint={false}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
