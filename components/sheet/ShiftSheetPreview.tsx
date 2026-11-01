'use client';

import React, { useRef, useEffect } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  const zoomRef = useRef<number>(zoomPercent);
  const onZoomChangeRef = useRef(onZoomChange);

  useEffect(() => {
    zoomRef.current = zoomPercent;
    onZoomChangeRef.current = onZoomChange;
  }, [zoomPercent, onZoomChange]);

  useEffect(() => {
    if (isPrint) return;
    const el = containerRef.current;
    if (!el) return;

    // Non-passive wheel handler: block browser zoom and allow zoom in/out on sheet canvas
    const handleNativeWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (!onZoomChangeRef.current) return;
        if (e.deltaY > 0) {
          // deltaY > 0 is scroll down (zoom out)
          onZoomChangeRef.current(Math.max(25, zoomRef.current - 10));
        } else if (e.deltaY < 0) {
          // deltaY < 0 is scroll up (zoom in)
          onZoomChangeRef.current(Math.min(150, zoomRef.current + 10));
        }
      }
    };

    // Touch start handler for 2-finger gestures
    const handleNativeTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialTouchDistanceRef.current = dist;
        initialZoomRef.current = zoomRef.current;
      }
    };

    // Non-passive touchmove handler: prevent default browser pinch-zoom and allow smooth pinch zoom in/out
    const handleNativeTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // ALWAYS prevent browser viewport pinch-to-zoom
        e.preventDefault();

        if (initialTouchDistanceRef.current && onZoomChangeRef.current) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          if (dist > 0 && initialTouchDistanceRef.current > 0) {
            const ratio = dist / initialTouchDistanceRef.current;
            const newZoom = Math.max(
              25,
              Math.min(150, Math.round(initialZoomRef.current * ratio))
            );
            if (newZoom !== zoomRef.current) {
              onZoomChangeRef.current(newZoom);
            }
          }
        }
      }
    };

    const handleNativeTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialTouchDistanceRef.current = null;
      }
    };

    // Intercept Safari proprietary gesture zoom
    const handleSafariGesture = (e: Event) => {
      e.preventDefault();
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    el.addEventListener('touchstart', handleNativeTouchStart, { passive: true });
    el.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    el.addEventListener('touchend', handleNativeTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleNativeTouchEnd, { passive: true });
    el.addEventListener('gesturestart', handleSafariGesture, { passive: false });
    el.addEventListener('gesturechange', handleSafariGesture, { passive: false });

    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
      el.removeEventListener('touchstart', handleNativeTouchStart);
      el.removeEventListener('touchmove', handleNativeTouchMove);
      el.removeEventListener('touchend', handleNativeTouchEnd);
      el.removeEventListener('touchcancel', handleNativeTouchEnd);
      el.removeEventListener('gesturestart', handleSafariGesture);
      el.removeEventListener('gesturechange', handleSafariGesture);
    };
  }, [isPrint]);

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

  return (
    <div
      ref={containerRef}
      style={{ touchAction: 'pan-x pan-y', overscrollBehavior: 'contain' }}
      className="sheet-preview-viewport w-full flex flex-col items-center py-4 px-2 overflow-auto overscroll-contain"
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
