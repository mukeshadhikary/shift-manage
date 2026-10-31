'use client';

import React from 'react';
import { ja } from '@/lib/i18n/ja';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = ja.common.confirm,
  cancelLabel = ja.common.cancel,
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xs bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-center animate-in zoom-in-95 duration-200"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="p-5">
          <h3 id="confirm-dialog-title" className="text-base font-semibold text-gray-900">
            {title}
          </h3>
          <p id="confirm-dialog-message" className="mt-2 text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">
            {message}
          </p>
        </div>

        <div className="grid grid-cols-2 border-t border-gray-200 divide-x divide-gray-200 text-sm font-medium">
          <button
            type="button"
            onClick={onCancel}
            className="py-3 text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors focus:outline-none"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`py-3 transition-colors focus:outline-none font-semibold ${
              isDestructive
                ? 'text-red-600 hover:bg-red-50 active:bg-red-100'
                : 'text-[#0F2A66] hover:bg-blue-50 active:bg-blue-100'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
