'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ja } from '@/lib/i18n/ja';
import { Download, FileSpreadsheet, FileText, Printer, ChevronDown } from 'lucide-react';
import { useToast } from '../ui/Toast';
import type { ShiftWithEmployees } from '@/lib/types';
import { exportShiftToExcel, exportShiftToPdfOrPrint } from '@/lib/export/clientExport';
import { getShiftByDate } from '@/lib/db/idb';

interface ExportMenuProps {
  shiftDate: string;
  shift?: ShiftWithEmployees | null;
}

export function ExportMenu({ shiftDate, shift }: ExportMenuProps) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync snapshot to localStorage so print/export views can access it synchronously
  useEffect(() => {
    if (shift && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`shift_snapshot_${shiftDate}`, JSON.stringify(shift));
      } catch {
        // ignore storage errors
      }
    }
  }, [shift, shiftDate]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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
    setIsOpen(false);

    try {
      setIsExporting(true);
      const targetShift = await resolveShift();
      if (!targetShift) {
        showToast('シフト表が見つかりません', 'error');
        return;
      }
      await exportShiftToExcel(targetShift);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ja.export.excelError;
      showToast(message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsOpen(false);

    try {
      const targetShift = await resolveShift();
      exportShiftToPdfOrPrint(shiftDate, targetShift);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ja.export.pdfError;
      showToast(message, 'error');
    }
  };

  const handlePrint = async () => {
    setIsOpen(false);
    try {
      const targetShift = await resolveShift();
      exportShiftToPdfOrPrint(shiftDate, targetShift);
    } catch {
      window.open(`/print/${shiftDate}?autoprint=1`, '_blank');
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="p-2.5 sm:px-3.5 sm:py-2 rounded-2xl bg-[#0F2A66] text-white text-xs font-semibold hover:bg-[#0c2252] active:bg-[#0a1a40] transition-colors shadow-xs flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px]"
        aria-expanded={isOpen}
        aria-label="出力"
        title="出力"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">出力</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-80 hidden sm:inline" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 divide-y divide-gray-100">
          <div className="py-1">
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{ja.export.excel}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-red-600 shrink-0" />
              <span>{ja.export.pdf}</span>
            </button>
          </div>

          <div className="py-1">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#0F2A66] shrink-0" />
              <span>{ja.export.print}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
