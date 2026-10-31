'use client';

import React, { useState, useTransition } from 'react';
import { HeaderSnapshot, DesignSnapshot } from '@/lib/types';
import { ja } from '@/lib/i18n/ja';
import { ShiftSheetPreview } from '../sheet/ShiftSheetPreview';
import { buildSheetModel } from '@/lib/sheet';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '../ui/Toast';
import {
  saveGlobalSettingsAction,
  restoreDefaultSettingsAction,
} from '@/app/actions';
import {
  RotateCcw,
  Check,
  Building2,
  FileText,
  Palette,
  Eye,
} from 'lucide-react';
import { DEFAULT_HEADER_SNAPSHOT, DEFAULT_DESIGN_SNAPSHOT } from '@/lib/defaults';

interface SettingsViewProps {
  initialCompanySettings: HeaderSnapshot;
  initialDesignSettings: DesignSnapshot;
  currentDateShiftId?: number | null;
  currentDate?: string;
}

export function SettingsView({
  initialCompanySettings,
  initialDesignSettings,
  currentDateShiftId,
  currentDate = '2026-10-31',
}: SettingsViewProps) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [company, setCompany] = useState<HeaderSnapshot>({ ...initialCompanySettings });
  const [design, setDesign] = useState<DesignSnapshot>({ ...initialDesignSettings });

  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showApplyToCurrentConfirm, setShowApplyToCurrentConfirm] = useState(false);

  // Live mini preview model
  const previewModel = buildSheetModel(
    {
      shift_date: currentDate,
      employees: [
        {
          id: 1,
          shift_id: 1,
          display_order: 1,
          employee_code: 'MS0001',
          employee_name: 'サンプル 太郎',
          nickname: 'タナカ',
          remarks: 'リーダー',
          planned_start_time: '09:00',
          actual_start_time: '08:55',
          planned_end_time: '18:00',
          break_time: '1:00',
          locker_number: '12',
          signature: null,
          created_at: '',
          updated_at: '',
        },
      ],
    },
    company,
    design
  );

  const handleSaveSettings = async () => {
    startTransition(async () => {
      const res = await saveGlobalSettingsAction({
        companySettings: company,
        designSettings: design,
      });

      if (res.success) {
        showToast(ja.settings.saveSuccess, 'success');
        if (currentDateShiftId) {
          setShowApplyToCurrentConfirm(true);
        }
      } else {
        showToast(res.error, 'error');
      }
    });
  };

  const handleApplyToCurrentConfirm = async () => {
    setShowApplyToCurrentConfirm(false);
    if (!currentDateShiftId) return;

    startTransition(async () => {
      const res = await saveGlobalSettingsAction({
        companySettings: company,
        designSettings: design,
        applyToShiftId: currentDateShiftId,
      });
      if (res.success) {
        showToast(ja.settings.applySuccess, 'success');
      }
    });
  };

  const handleRestoreDefaults = async () => {
    setShowRestoreConfirm(false);
    startTransition(async () => {
      const res = await restoreDefaultSettingsAction();
      if (res.success) {
        setCompany({ ...DEFAULT_HEADER_SNAPSHOT });
        setDesign({ ...DEFAULT_DESIGN_SNAPSHOT });
        showToast(ja.settings.restoreSuccess, 'success');
      } else {
        showToast(res.error, 'error');
      }
    });
  };

  const updateColumnLabel = (index: number, newLabel: string) => {
    const next = [...company.columnLabels];
    next[index] = newLabel;
    setCompany({ ...company, columnLabels: next });
  };

  const updateColumnWidth = (index: number, newWidth: number) => {
    const next = [...design.columnWidths];
    next[index] = newWidth;
    setDesign({ ...design, columnWidths: next });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 pb-28 flex flex-col gap-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{ja.settings.title}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{ja.settings.subtitle}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowRestoreConfirm(true)}
            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 text-xs font-semibold flex items-center gap-1.5 transition-colors min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
            <span>{ja.settings.restoreDefaults}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isPending}
            className="px-5 py-2 rounded-xl bg-[#0F2A66] hover:bg-[#0c2252] active:bg-[#0a1a40] text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all min-h-[44px] disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isPending ? ja.common.loading : ja.common.save}</span>
          </button>
        </div>
      </div>

      {/* Live Mini Preview Box */}
      <div className="bg-white p-4 rounded-3xl shadow-xs border border-gray-100 flex flex-col items-center">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 w-full mb-3">
          <Eye className="w-4 h-4 text-[#0F2A66]" />
          <span>{ja.settings.livePreview}</span>
        </div>
        <div className="w-full overflow-hidden flex justify-center py-2 bg-gray-50 rounded-2xl border border-gray-100">
          <ShiftSheetPreview model={previewModel} zoomPercent={38} />
        </div>
      </div>

      {/* Section 1: 会社情報 (Company Info) */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-gray-100 flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-sm font-bold text-gray-900">
          <Building2 className="w-4 h-4 text-[#0F2A66]" />
          <span>{ja.settings.companySection}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {ja.settings.companyName}
            </label>
            <input
              type="text"
              value={company.companyName}
              onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {ja.settings.documentTitle}
            </label>
            <input
              type="text"
              value={company.title}
              onChange={(e) => setCompany({ ...company, title: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {ja.settings.managerName}
            </label>
            <input
              type="text"
              value={company.managerName}
              onChange={(e) => setCompany({ ...company, managerName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {ja.settings.faxNumber}
            </label>
            <input
              type="text"
              value={company.faxNumber}
              onChange={(e) => setCompany({ ...company, faxNumber: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {ja.settings.transmissionInstructions}
            </label>
            <input
              type="text"
              value={company.transmissionInstructions}
              onChange={(e) =>
                setCompany({ ...company, transmissionInstructions: e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
            />
          </div>
        </div>
      </div>

      {/* Section 2: 文書テキスト (Document Text) */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-gray-100 flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-sm font-bold text-gray-900">
          <FileText className="w-4 h-4 text-[#0F2A66]" />
          <span>{ja.settings.textSection}</span>
        </div>

        {/* 11 Column Labels */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            {ja.settings.columnLabels}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {company.columnLabels.map((lbl, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400 font-mono w-4 shrink-0 text-right">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={lbl}
                  onChange={(e) => updateColumnLabel(idx, e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F2A66]"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {ja.settings.verticalInstructions}
          </label>
          <textarea
            rows={2}
            value={company.verticalInstructions}
            onChange={(e) => setCompany({ ...company, verticalInstructions: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {ja.settings.approvalTitle}
            </label>
            <input
              type="text"
              value={company.approvalTitle}
              onChange={(e) => setCompany({ ...company, approvalTitle: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {ja.settings.approvalPosition}
            </label>
            <input
              type="text"
              value={company.approvalPosition}
              onChange={(e) => setCompany({ ...company, approvalPosition: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {ja.settings.additionalNotes}
          </label>
          <input
            type="text"
            value={company.additionalNotes || ''}
            onChange={(e) => setCompany({ ...company, additionalNotes: e.target.value })}
            placeholder={ja.settings.notesPlaceholder}
            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#0F2A66]"
          />
        </div>
      </div>

      {/* Section 3: デザイン設定 (Design Settings) */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-gray-100 flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-sm font-bold text-gray-900">
          <Palette className="w-4 h-4 text-[#0F2A66]" />
          <span>{ja.settings.designSection}</span>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              {ja.settings.headerColor}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={design.headerColor}
                onChange={(e) => setDesign({ ...design, headerColor: e.target.value })}
                className="w-9 h-9 rounded-xl border border-gray-200 cursor-pointer p-0.5 shrink-0"
              />
              <span className="text-xs font-mono text-gray-700 uppercase">
                {design.headerColor}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              {ja.settings.tableHeaderColor}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={design.tableHeaderColor}
                onChange={(e) => setDesign({ ...design, tableHeaderColor: e.target.value })}
                className="w-9 h-9 rounded-xl border border-gray-200 cursor-pointer p-0.5 shrink-0"
              />
              <span className="text-xs font-mono text-gray-700 uppercase">
                {design.tableHeaderColor}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              {ja.settings.rowColorOdd}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={design.rowColorOdd}
                onChange={(e) => setDesign({ ...design, rowColorOdd: e.target.value })}
                className="w-9 h-9 rounded-xl border border-gray-200 cursor-pointer p-0.5 shrink-0"
              />
              <span className="text-xs font-mono text-gray-700 uppercase">
                {design.rowColorOdd}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              {ja.settings.rowColorEven}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={design.rowColorEven}
                onChange={(e) => setDesign({ ...design, rowColorEven: e.target.value })}
                className="w-9 h-9 rounded-xl border border-gray-200 cursor-pointer p-0.5 shrink-0"
              />
              <span className="text-xs font-mono text-gray-700 uppercase">
                {design.rowColorEven}
              </span>
            </div>
          </div>
        </div>

        {/* Font scale and row height sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-700">
                {ja.settings.fontScale}
              </label>
              <span className="text-xs font-mono font-bold text-[#0F2A66]">
                {design.fontScale}%
              </span>
            </div>
            <input
              type="range"
              min="80"
              max="120"
              step="5"
              value={design.fontScale}
              onChange={(e) => setDesign({ ...design, fontScale: Number(e.target.value) })}
              className="w-full accent-[#0F2A66]"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-700">
                {ja.settings.rowHeightMm}
              </label>
              <span className="text-xs font-mono font-bold text-[#0F2A66]">
                {design.rowHeightMm} mm
              </span>
            </div>
            <input
              type="range"
              min="8"
              max="20"
              step="0.5"
              value={design.rowHeightMm}
              onChange={(e) =>
                setDesign({ ...design, rowHeightMm: Number(e.target.value) })
              }
              className="w-full accent-[#0F2A66]"
            />
          </div>
        </div>

        {/* Column Widths (%) */}
        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            {ja.settings.columnWidths}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {company.columnLabels.map((lbl, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-500 w-16 truncate shrink-0">
                  {lbl}:
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="50"
                  value={design.columnWidths[idx] || 0}
                  onChange={(e) => updateColumnWidth(idx, parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 rounded-lg border border-gray-200 text-xs text-gray-900 font-mono focus:outline-none focus:border-[#0F2A66]"
                />
                <span className="text-[10px] text-gray-400 font-mono">%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Margins (mm) */}
        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            {ja.settings.margins}
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">{ja.settings.marginLeft}</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={design.margins.left}
                onChange={(e) =>
                  setDesign({
                    ...design,
                    margins: { ...design.margins, left: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-900 font-mono focus:outline-none focus:border-[#0F2A66]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">{ja.settings.marginRight}</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={design.margins.right}
                onChange={(e) =>
                  setDesign({
                    ...design,
                    margins: { ...design.margins, right: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-900 font-mono focus:outline-none focus:border-[#0F2A66]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">{ja.settings.marginBottom}</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={design.margins.bottom}
                onChange={(e) =>
                  setDesign({
                    ...design,
                    margins: { ...design.margins, bottom: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-900 font-mono focus:outline-none focus:border-[#0F2A66]"
              />
            </div>
          </div>
        </div>

        {/* Background Decor Switch */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div>
            <span className="text-xs font-semibold text-gray-800 block">
              {ja.settings.showDecor}
            </span>
            <span className="text-[11px] text-gray-500">
              {ja.settings.decorDesc}
            </span>
          </div>
          <input
            type="checkbox"
            checked={design.additionalSettings?.showDecor ?? true}
            onChange={(e) =>
              setDesign({
                ...design,
                additionalSettings: {
                  ...design.additionalSettings,
                  showDecor: e.target.checked,
                },
              })
            }
            className="w-5 h-5 rounded-md accent-[#0F2A66] cursor-pointer"
          />
        </div>

        {/* FAX Monochrome Switch */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div>
            <span className="text-xs font-semibold text-gray-800 block">
              {ja.settings.faxMonochrome}
            </span>
            <span className="text-[11px] text-gray-500">
              {ja.settings.faxMonochromeDesc}
            </span>
          </div>
          <input
            type="checkbox"
            checked={design.additionalSettings?.faxMonochrome ?? false}
            onChange={(e) =>
              setDesign({
                ...design,
                additionalSettings: {
                  ...design.additionalSettings,
                  faxMonochrome: e.target.checked,
                },
              })
            }
            className="w-5 h-5 rounded-md accent-[#0F2A66] cursor-pointer"
          />
        </div>
      </div>

      {/* Section 4: バックアップ (Backup & Maintenance) */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-gray-100 flex flex-col gap-3">
        <h3 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-100">
          {ja.settings.backupSection}
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          {ja.settings.backupDesc}
        </p>
        <div>
          <a
            href="/api/backup"
            download
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-xs font-semibold text-gray-800 transition-colors"
          >
            <span>{ja.settings.downloadDb}</span>
          </a>
        </div>
      </div>

      {/* Restore Defaults Confirmation */}
      <ConfirmDialog
        isOpen={showRestoreConfirm}
        title={ja.settings.restoreDefaults}
        message={ja.settings.restoreConfirm}
        confirmLabel={ja.settings.restoreDefaults}
        cancelLabel={ja.common.cancel}
        isDestructive={true}
        onConfirm={handleRestoreDefaults}
        onCancel={() => setShowRestoreConfirm(false)}
      />

      {/* Apply to Current Shift Dialog */}
      <ConfirmDialog
        isOpen={showApplyToCurrentConfirm}
        title={ja.common.confirm}
        message={ja.settings.savePromptToApplyCurrent}
        confirmLabel={ja.settings.applyToCurrent}
        cancelLabel={ja.settings.futureOnly}
        isDestructive={false}
        onConfirm={handleApplyToCurrentConfirm}
        onCancel={() => setShowApplyToCurrentConfirm(false)}
      />
    </div>
  );
}
