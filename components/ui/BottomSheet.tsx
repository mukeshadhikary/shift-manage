'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { ja } from '@/lib/i18n/ja';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: string;
  fullScreenMobile?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = 'max-h-[90dvh]',
  fullScreenMobile = false,
}: BottomSheetProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Tap backdrop to dismiss */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      <div
        className={`w-full ${
          fullScreenMobile
            ? 'h-[100dvh] sm:h-auto sm:max-h-[88dvh] rounded-none sm:rounded-3xl'
            : `${maxHeight} rounded-t-3xl sm:rounded-3xl`
        } max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in slide-in-from-bottom duration-300 motion-reduce:duration-0`}
        role="dialog"
        aria-modal="true"
      >
        {/* iOS Grabber */}
        {!fullScreenMobile && (
          <div className="pt-2.5 pb-1 flex justify-center shrink-0">
            <div className="w-9 h-1 rounded-full bg-gray-300" />
          </div>
        )}

        {/* Header */}
        {(title || subtitle) && (
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur">
            <div>
              {title && <h2 className="text-base font-semibold text-gray-900 leading-tight">{title}</h2>}
              {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={ja.common.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
