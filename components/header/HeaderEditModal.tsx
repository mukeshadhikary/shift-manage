'use client';

import React, { useState } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { HeaderSnapshot } from '@/lib/types';
import { ja } from '@/lib/i18n/ja';
import { updateShiftHeaderSnapshot } from '@/lib/db/idb';
import { useToast } from '../ui/Toast';

interface HeaderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: number;
  initialHeader: HeaderSnapshot;
  onSuccess: () => void;
}

export function HeaderEditModal({
  isOpen,
  onClose,
  shiftId,
  initialHeader,
  onSuccess,
}: HeaderEditModalProps) {
  const { showToast } = useToast();
  const [header, setHeader] = useState<HeaderSnapshot>({ ...initialHeader });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateShiftHeaderSnapshot(shiftId, header);
      showToast(ja.toasts.saved, 'success');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ja.toasts.saveFailed;
      showToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={ja.shift.editHeader}
      subtitle={ja.header.editSubtitle}
    >
      <form onSubmit={handleSave} className="flex flex-col gap-4 text-left">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {ja.settings.managerName}
          </label>
          <input
            type="text"
            value={header.managerName}
            onChange={(e) => setHeader({ ...header, managerName: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {ja.settings.faxNumber}
          </label>
          <input
            type="text"
            value={header.faxNumber}
            onChange={(e) => setHeader({ ...header, faxNumber: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {ja.settings.transmissionInstructions}
          </label>
          <input
            type="text"
            value={header.transmissionInstructions}
            onChange={(e) => setHeader({ ...header, transmissionInstructions: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {ja.settings.companyName}
          </label>
          <input
            type="text"
            value={header.companyName}
            onChange={(e) => setHeader({ ...header, companyName: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {ja.settings.documentTitle}
          </label>
          <input
            type="text"
            value={header.title}
            onChange={(e) => setHeader({ ...header, title: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {ja.settings.verticalInstructions}
          </label>
          <textarea
            rows={2}
            value={header.verticalInstructions}
            onChange={(e) => setHeader({ ...header, verticalInstructions: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {ja.settings.approvalTitle}
            </label>
            <input
              type="text"
              value={header.approvalTitle}
              onChange={(e) => setHeader({ ...header, approvalTitle: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {ja.settings.approvalPosition}
            </label>
            <input
              type="text"
              value={header.approvalPosition}
              onChange={(e) => setHeader({ ...header, approvalPosition: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {ja.settings.additionalNotes}
          </label>
          <input
            type="text"
            value={header.additionalNotes || ''}
            onChange={(e) => setHeader({ ...header, additionalNotes: e.target.value })}
            placeholder={ja.settings.notesPlaceholder}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
          />
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-100 min-h-[44px]"
          >
            {ja.common.cancel}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 py-3 px-4 rounded-xl bg-[#0F2A66] hover:bg-[#0c2252] text-white text-sm font-semibold shadow-md min-h-[44px] disabled:opacity-50"
          >
            {isSaving ? ja.common.loading : ja.common.save}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
