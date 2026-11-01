'use client';

import React, { useState } from 'react';
import { ja } from '@/lib/i18n/ja';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { useToast } from '../ui/Toast';
import type { ShiftWithEmployees } from '@/lib/types';
import { exportShiftToExcel } from '@/lib/export/clientExport';
import { getShiftByDate } from '@/lib/db/idb';

interface ExportMenuProps {
  shiftDate: string;
  shift?: ShiftWithEmployees | null;
}

/**
 * Direct 1-click Excel export button.
 * On mobile: displays only the spreadsheet icon.
 * On desktop: displays the spreadsheet icon + "Excel出力".
 * Triggers an instant download of the .xlsx file to the default browser downloads location.
 */
export function ExportMenu({ shiftDate, shift }: ExportMenuProps) {
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const resolveShift = async (): Promise<ShiftWithEmployees | null> => {
    if (shift) return shift;
    try {
      return await getShiftByDate(shiftDate);
    } catch {
      return null;
    }
  };

  const handleDownloadExcel = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isExporting) return;

    try {
      setIsExporting(true);
      const targetShift = await resolveShift();
      if (!targetShift) {
        showToast('シフト表が見つかりません', 'error');
        return;
      }
      await exportShiftToExcel(targetShift);
      showToast('Excelファイルをダウンロードしました', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ja.export.excelError;
      showToast(message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownloadExcel}
      disabled={isExporting}
      className="p-2.5 sm:px-3.5 sm:py-2 rounded-2xl bg-[#0F2A66] text-white text-xs font-semibold hover:bg-[#0c2252] active:bg-[#0a1a40] transition-colors shadow-xs flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] cursor-pointer disabled:opacity-60"
      aria-label="Excel出力"
      title="Excel出力"
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
      )}
      <span className="hidden sm:inline">Excel出力</span>
    </button>
  );
}
