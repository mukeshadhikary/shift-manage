'use client';

import React, { useState } from 'react';
import type { HeaderSnapshot, DesignSnapshot } from '@/lib/types';
import type { EmployeeInput } from '@/lib/db/schema';
import { EmployeeForm } from '../employee/EmployeeForm';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ja } from '@/lib/i18n/ja';
import { saveShiftWizard } from '@/lib/db/idb';
import { useToast } from '../ui/Toast';
import {
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  ArrowLeft,
  Check,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  User,
} from 'lucide-react';
export interface ShiftCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  shiftDate: string;
  defaultHeaderSnapshot: HeaderSnapshot;
  defaultDesignSnapshot: DesignSnapshot;
  onSuccess: () => void;
}

export function ShiftCreationWizard(props: ShiftCreationWizardProps) {
  if (!props.isOpen) return null;
  return <ShiftCreationWizardContent {...props} />;
}

function ShiftCreationWizardContent({
  onClose,
  shiftDate,
  defaultHeaderSnapshot,
  defaultDesignSnapshot,
  onSuccess,
}: {
  onClose: () => void;
  shiftDate: string;
  defaultHeaderSnapshot: HeaderSnapshot;
  defaultDesignSnapshot: DesignSnapshot;
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [draftEmployees, setDraftEmployees] = useState<EmployeeInput[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentEmployee, setCurrentEmployee] = useState<Partial<EmployeeInput>>({
    locker_number: ja.common.none,
    planned_start_time: '09:00',
    planned_end_time: '18:00',
    break_time: '1:00',
  });
  const [shiftHeader, setShiftHeader] = useState<HeaderSnapshot>({ ...defaultHeaderSnapshot });
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleStep1Save = (emp: EmployeeInput) => {
    if (editingIndex !== null) {
      // Updated an existing draft
      setDraftEmployees((prev) => {
        const next = [...prev];
        next[editingIndex] = emp;
        return next;
      });
      setEditingIndex(null);
    } else {
      // Add new draft employee
      setDraftEmployees((prev) => [...prev, emp]);
    }

    // Reset current employee draft for next entry
    setCurrentEmployee({
      locker_number: ja.common.none,
      planned_start_time: emp.planned_start_time || '09:00',
      planned_end_time: emp.planned_end_time || '18:00',
      break_time: emp.break_time || '1:00',
    });

    setStep(2);
  };

  const handleAddNewStaffClick = () => {
    setEditingIndex(null);
    setCurrentEmployee({
      locker_number: ja.common.none,
      planned_start_time: '09:00',
      planned_end_time: '18:00',
      break_time: '1:00',
    });
    setStep(1);
  };

  const handleEditDraft = (index: number) => {
    setEditingIndex(index);
    setCurrentEmployee(draftEmployees[index]);
    setStep(1);
  };

  const handleDeleteDraft = (index: number) => {
    setDraftEmployees((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveUpDraft = (index: number) => {
    if (index === 0) return;
    setDraftEmployees((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMoveDownDraft = (index: number) => {
    if (index >= draftEmployees.length - 1) return;
    setDraftEmployees((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleAttemptClose = () => {
    if (draftEmployees.length > 0 || (currentEmployee.employee_name && currentEmployee.employee_name.trim())) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const handleFinalComplete = async () => {
    setIsSaving(true);
    try {
      await saveShiftWizard({
        shift_date: shiftDate,
        header_snapshot: shiftHeader,
        design_snapshot: defaultDesignSnapshot,
        employees: draftEmployees,
      });
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

  const existingCodes = draftEmployees
    .map((e) => e.employee_code)
    .filter((c): c is string => Boolean(c));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F2F2F7] animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0 shadow-xs">
        <button
          type="button"
          onClick={handleAttemptClose}
          className="text-gray-500 hover:text-gray-800 text-sm font-medium flex items-center gap-1 min-h-[44px] min-w-[44px]"
        >
          <X className="w-5 h-5" />
          <span>{ja.common.close}</span>
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="font-bold text-base text-gray-900 leading-tight">
            {step === 1 ? ja.wizard.step1Title : ja.wizard.step2Title}
          </span>
          <span className="text-[11px] font-semibold text-[#0F2A66] mt-0.5">
            {ja.wizard.stepIndicator(step, 2)}
          </span>
        </div>

        {/* Dummy right spacing or forward indicator */}
        <div className="w-12 text-right">
          {step === 1 && draftEmployees.length > 0 && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm font-semibold text-[#0F2A66] hover:underline"
            >
              {ja.wizard.skip}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">
        {step === 1 ? (
          <div className="bg-white p-5 rounded-3xl shadow-xs border border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              {editingIndex !== null ? ja.wizard.step1Edit : ja.wizard.step1Add}
            </h3>
            <EmployeeForm
              initialData={currentEmployee}
              onSave={handleStep1Save}
              onCancel={handleAttemptClose}
              isWizardStep={true}
              existingCodes={existingCodes}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Registered Staff List */}
            <div className="bg-white p-5 rounded-3xl shadow-xs border border-gray-100 text-left">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <h3 className="font-bold text-sm text-gray-800">
                  {ja.wizard.staffList} ({draftEmployees.length}{ja.shift.staffCount})
                </h3>
                <button
                  type="button"
                  onClick={handleAddNewStaffClick}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 text-[#0F2A66] text-xs font-semibold hover:bg-blue-100 flex items-center gap-1 transition-colors min-h-[44px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{ja.shift.addStaff}</span>
                </button>
              </div>

              {draftEmployees.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <User className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  {ja.wizard.noStaffAddedYet}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {draftEmployees.map((emp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-full bg-white text-[#0F2A66] text-xs font-bold flex items-center justify-center shadow-2xs border border-gray-200 shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-sm text-gray-900 truncate">
                            {emp.employee_name}
                            {emp.employee_code && (
                              <span className="ml-2 font-mono text-xs text-gray-500 font-normal">
                                [{emp.employee_code}]
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                            {emp.planned_start_time || '--:--'} 〜 {emp.planned_end_time || '--:--'} | {ja.employee.breakTime}: {emp.break_time || ja.common.none}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveUpDraft(idx)}
                          disabled={idx === 0}
                          className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                          aria-label={ja.common.moveUp}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDownDraft(idx)}
                          disabled={idx === draftEmployees.length - 1}
                          className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                          aria-label={ja.common.moveDown}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditDraft(idx)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100/60 rounded-lg"
                          aria-label={ja.common.edit}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDraft(idx)}
                          className="p-1.5 text-red-500 hover:bg-red-100/60 rounded-lg"
                          aria-label={ja.common.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Collapsible Header Settings (Per-shift only) */}
            <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden text-left">
              <button
                type="button"
                onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                className="w-full px-5 py-4 flex items-center justify-between text-left font-semibold text-sm text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <span>{ja.wizard.headerSettingsCollapsible}</span>
                {isHeaderExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {isHeaderExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-gray-100 flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      {ja.settings.managerName}
                    </label>
                    <input
                      type="text"
                      value={shiftHeader.managerName}
                      onChange={(e) => setShiftHeader({ ...shiftHeader, managerName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      {ja.settings.faxNumber}
                    </label>
                    <input
                      type="text"
                      value={shiftHeader.faxNumber}
                      onChange={(e) => setShiftHeader({ ...shiftHeader, faxNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      {ja.settings.transmissionInstructions}
                    </label>
                    <input
                      type="text"
                      value={shiftHeader.transmissionInstructions}
                      onChange={(e) => setShiftHeader({ ...shiftHeader, transmissionInstructions: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      {ja.settings.additionalNotes}
                    </label>
                    <input
                      type="text"
                      value={shiftHeader.additionalNotes || ''}
                      onChange={(e) => setShiftHeader({ ...shiftHeader, additionalNotes: e.target.value })}
                      placeholder={ja.wizard.notesPlaceholder}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation (Step 2) */}
      {step === 2 && (
        <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0 flex items-center justify-between gap-3 shadow-lg">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="py-3 px-5 rounded-2xl border border-gray-200 font-semibold text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{ja.common.back}</span>
          </button>

          <button
            type="button"
            onClick={handleFinalComplete}
            disabled={isSaving}
            className="flex-1 py-3 px-6 rounded-2xl bg-[#0F2A66] hover:bg-[#0c2252] active:bg-[#0a1a40] text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-all min-h-[44px] disabled:opacity-50"
          >
            <Check className="w-5 h-5" />
            <span>{isSaving ? ja.common.loading : ja.wizard.saveAndCreate}</span>
          </button>
        </div>
      )}

      {/* Unsaved Warning Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCloseConfirm}
        title={ja.common.confirm}
        message={ja.wizard.unsavedWarning}
        confirmLabel={ja.wizard.discardAndClose}
        cancelLabel={ja.wizard.continueEditing}
        isDestructive={true}
        onConfirm={() => {
          setShowCloseConfirm(false);
          onClose();
        }}
        onCancel={() => setShowCloseConfirm(false)}
      />
    </div>
  );
}
