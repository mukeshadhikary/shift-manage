'use client';

import React, { useEffect, useState } from 'react';
import type { ShiftWithEmployees } from '@/lib/types';
import { buildSheetModel } from '@/lib/sheet';
import { ShiftSheetPreview } from '@/components/sheet/ShiftSheetPreview';
import { getShiftByDate } from '@/lib/db/idb';

interface PrintClientViewProps {
  date: string;
  serverShift: ShiftWithEmployees | null;
  autoPrint?: boolean;
}

export function PrintClientView({ date, serverShift, autoPrint }: PrintClientViewProps) {
  const [shift, setShift] = useState<ShiftWithEmployees | null>(serverShift);
  const [isLoading, setIsLoading] = useState(!serverShift);

  useEffect(() => {
    let isMounted = true;

    async function loadShift() {
      // 1. Check if serverShift already present
      if (serverShift) {
        setIsLoading(false);
        return;
      }

      // 2. Check localStorage snapshot
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(`shift_snapshot_${date}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') {
              if (isMounted) {
                setShift(parsed);
                setIsLoading(false);
                return;
              }
            }
          }
        } catch {
          // ignore storage errors
        }
      }

      // 3. Fallback to IndexedDB
      try {
        const idbShift = await getShiftByDate(date);
        if (isMounted) {
          if (idbShift) {
            setShift(idbShift);
          }
          setIsLoading(false);
        }
      } catch {
        if (isMounted) setIsLoading(false);
      }
    }

    loadShift();

    return () => {
      isMounted = false;
    };
  }, [date, serverShift]);

  useEffect(() => {
    if (autoPrint && shift && !isLoading && typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, shift, isLoading]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500 font-sans">
        <p className="text-base font-semibold">読み込み中...</p>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="p-8 text-center text-gray-500 font-sans">
        <p className="text-base font-semibold">シフト表が見つかりません</p>
        <p className="text-xs text-gray-400 mt-1">日付: {date}</p>
      </div>
    );
  }

  const model = buildSheetModel(shift, shift.header_snapshot, shift.design_snapshot);

  return (
    <main className="bg-white min-h-screen">
      <ShiftSheetPreview model={model} zoomPercent={100} isPrint={true} />
    </main>
  );
}
