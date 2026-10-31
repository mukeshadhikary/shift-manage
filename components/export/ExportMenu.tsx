'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ja } from '@/lib/i18n/ja';
import { Download, FileSpreadsheet, FileText, Printer, Share2, ChevronDown } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface ExportMenuProps {
  shiftDate: string;
}

export function ExportMenu({ shiftDate }: ExportMenuProps) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pdfBlobRef = useRef<Blob | null>(null);

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

  // Pre-fetch PDF when menu opens so Web Share API can use the file directly inside tap handler
  useEffect(() => {
    if (isOpen && !pdfBlobRef.current) {
      fetch(`/api/shifts/${shiftDate}/pdf`)
        .then((res) => {
          if (res.ok) return res.blob();
          return null;
        })
        .then((blob) => {
          if (blob) pdfBlobRef.current = blob;
        })
        .catch(() => {
          // ignore prefetch errors
        });
    }
  }, [isOpen, shiftDate]);

  const triggerDownload = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', '');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadPdf = () => {
    setIsOpen(false);
    triggerDownload(`/api/shifts/${shiftDate}/pdf`);
  };

  const handlePrint = () => {
    setIsOpen(false);
    const printWindow = window.open(`/print/${shiftDate}`, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      });
    }
  };

  const handleShare = async () => {
    setIsOpen(false);
    const filename = `${shiftDate}_${ja.app.title}.pdf`;

    try {
      let blob = pdfBlobRef.current;
      if (!blob) {
        setIsExporting(true);
        const res = await fetch(`/api/shifts/${shiftDate}/pdf`);
        setIsExporting(false);
        if (!res.ok) throw new Error(ja.export.pdfError);
        blob = await res.blob();
      }

      const file = new File([blob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${ja.app.title} (${shiftDate})`,
          text: `${shiftDate} の${ja.app.title}です。`,
          files: [file],
        });
      } else {
        // Fallback to normal download
        handleDownloadPdf();
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        showToast(ja.export.pdfError, 'error');
        // Fallback
        handleDownloadPdf();
      }
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
            <a
              href={`/api/shifts/${shiftDate}/xlsx`}
              download
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{ja.export.excel}</span>
            </a>

            <a
              href={`/api/shifts/${shiftDate}/pdf`}
              download
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-red-600 shrink-0" />
              <span>{ja.export.pdf}</span>
            </a>
          </div>

          <div className="py-1">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-[#0F2A66] shrink-0" />
              <span>{ja.export.print}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="w-full px-4 py-2.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
            >
              <Share2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{ja.export.share}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
