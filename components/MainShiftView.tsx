'use client';

import React, { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShiftWithEmployees,
  HeaderSnapshot,
  DesignSnapshot,
  ShiftEmployee,
} from '@/lib/types';
import type { EmployeeInput } from '@/lib/db/schema';
import { buildSheetModel } from '@/lib/sheet';
import { ja } from '@/lib/i18n/ja';
import { CalendarTimeline } from './timeline/CalendarTimeline';
import { ShiftSheetPreview } from './sheet/ShiftSheetPreview';
import { EmployeeList } from './employee/EmployeeList';
import { ShiftCreationWizard } from './wizard/ShiftCreationWizard';
import { EmployeeForm } from './employee/EmployeeForm';
import { HeaderEditModal } from './header/HeaderEditModal';
import { ZoomControls } from './controls/ZoomControls';
import { ExportMenu } from './export/ExportMenu';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { BottomSheet } from './ui/BottomSheet';
import { useToast } from './ui/Toast';
import {
  copyPreviousShiftAction,
  deleteShiftAction,
  addEmployeeAction,
  updateEmployeeAction,
  deleteEmployeeAction,
  reorderEmployeesAction,
  fetchShiftDataAction,
  fetchShiftDatesInRangeAction,
} from '@/app/actions';
import {
  Plus,
  Copy,
  MoreVertical,
  Calendar,
  FileSpreadsheet,
  ListFilter,
  Edit,
  Trash2,
} from 'lucide-react';
import { addDays } from '@/lib/date';

interface MainShiftViewProps {
  initialDate: string;
  initialShift: ShiftWithEmployees | null;
  defaultCompanySettings: HeaderSnapshot;
  defaultDesignSettings: DesignSnapshot;
  initialShiftDates: string[];
}

export function MainShiftView({
  initialDate,
  initialShift,
  defaultCompanySettings,
  defaultDesignSettings,
  initialShiftDates,
}: MainShiftViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [currentDate, setCurrentDate] = useState(initialDate);
  const [shift, setShift] = useState<ShiftWithEmployees | null>(initialShift);
  const [prevInitialShift, setPrevInitialShift] = useState(initialShift);
  if (prevInitialShift !== initialShift) {
    setPrevInitialShift(initialShift);
    setShift(initialShift);
  }
  const [shiftDates, setShiftDates] = useState<string[]>(initialShiftDates);
  const [viewMode, setViewMode] = useState<'sheet' | 'list'>('sheet');
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  // Modals & Sheets
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [isAddStaffSheetOpen, setIsAddStaffSheetOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<ShiftEmployee | null>(null);
  const [showShiftDeleteConfirm, setShowShiftDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<ShiftEmployee | null>(null);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Load shift data when currentDate changes
  const loadDateData = useCallback(async (date: string) => {
    try {
      const data = await fetchShiftDataAction(date);
      setShift(data.shift);
    } catch {
      showToast(ja.toasts.networkError, 'error');
    }
  }, [showToast]);

  // Update dots in range
  const refreshShiftDots = useCallback(async (centerDate: string) => {
    try {
      const start = addDays(centerDate, -30);
      const end = addDays(centerDate, 30);
      const dates = await fetchShiftDatesInRangeAction(start, end);
      setShiftDates(dates);
    } catch {
      // ignore
    }
  }, []);

  const handleSelectDate = (date: string) => {
    setCurrentDate(date);
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', date);
    router.replace(`/?${params.toString()}`, { scroll: false });
    loadDateData(date);
    refreshShiftDots(date);
  };

  // Fit to width zoom calculation
  const calculateFitToWidth = useCallback(() => {
    if (!containerRef.current) return 75;
    const containerWidth = containerRef.current.clientWidth - 32;
    // 297mm in pixels at 96 DPI: 297 * 96 / 25.4 = 1122.5px
    const a4WidthPx = 1122.5;
    const calculated = (containerWidth / a4WidthPx) * 100;
    return Math.max(25, Math.min(150, Math.round(calculated)));
  }, []);


  useEffect(() => {
    const handleResize = () => {
      setZoomPercent(calculateFitToWidth());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateFitToWidth]);

  // Copy previous shift handler
  const handleCopyPreviousShift = async () => {
    startTransition(async () => {
      const res = await copyPreviousShiftAction(currentDate);
      if (res.success) {
        showToast(ja.toasts.copied, 'success');
        loadDateData(currentDate);
        refreshShiftDots(currentDate);
      } else {
        showToast(res.error, 'error');
      }
    });
  };

  // Shift delete handler
  const handleDeleteShift = async () => {
    if (!shift) return;
    setShowShiftDeleteConfirm(false);
    startTransition(async () => {
      const res = await deleteShiftAction(shift.id, currentDate);
      if (res.success) {
        showToast(ja.toasts.deleted, 'success');
        setShift(null);
        refreshShiftDots(currentDate);
      } else {
        showToast(res.error, 'error');
      }
    });
  };

  // Add employee handler
  const handleAddEmployeeSave = async (empData: EmployeeInput) => {
    if (!shift) return;
    setIsAddStaffSheetOpen(false);
    startTransition(async () => {
      const res = await addEmployeeAction(shift.id, empData);
      if (res.success) {
        showToast(ja.toasts.saved, 'success');
        loadDateData(currentDate);
      } else {
        showToast(res.error, 'error');
      }
    });
  };

  // Update employee handler
  const handleUpdateEmployeeSave = async (empData: EmployeeInput) => {
    if (!editingEmployee) return;
    setEditingEmployee(null);
    startTransition(async () => {
      const res = await updateEmployeeAction(editingEmployee.id, empData);
      if (res.success) {
        showToast(ja.toasts.saved, 'success');
        loadDateData(currentDate);
      } else {
        showToast(res.error, 'error');
      }
    });
  };

  // Delete employee handler
  const handleConfirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    const target = employeeToDelete;
    setEmployeeToDelete(null);
    setEditingEmployee(null);
    startTransition(async () => {
      const res = await deleteEmployeeAction(target.id);
      if (res.success) {
        showToast(ja.toasts.deleted, 'success');
        loadDateData(currentDate);
      } else {
        showToast(res.error, 'error');
      }
    });
  };

  // Move employee up/down
  const handleMoveEmployee = async (fromIndex: number, toIndex: number) => {
    if (!shift || !shift.employees) return;
    const emps = [...shift.employees];
    const item = emps[fromIndex];
    emps.splice(fromIndex, 1);
    emps.splice(toIndex, 0, item);

    // Optimistic update
    setShift({ ...shift, employees: emps });

    const ids = emps.map((e) => e.id);
    await reorderEmployeesAction(shift.id, ids);
    loadDateData(currentDate);
  };

  // Tap row on preview
  const handlePreviewRowClick = (employeeId?: number) => {
    if (!shift) return;
    if (employeeId) {
      const found = shift.employees.find((e) => e.id === employeeId);
      if (found) {
        setEditingEmployee(found);
      }
    } else {
      setIsAddStaffSheetOpen(true);
    }
  };

  const sheetModel = shift
    ? buildSheetModel(shift, shift.header_snapshot, shift.design_snapshot)
    : null;

  return (
    <div className="flex flex-col flex-1 w-full min-h-0 bg-[#F2F2F7]" ref={containerRef}>
      {/* Calendar Timeline */}
      <CalendarTimeline
        selectedDate={currentDate}
        shiftDates={shiftDates}
        onSelectDate={handleSelectDate}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-start w-full relative overflow-y-auto">
        {!shift ? (
          /* Empty State: No Shift */
          <div className="flex-1 flex flex-col items-center justify-center p-6 pb-36 text-center max-w-sm mx-auto my-auto animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#0F2A66] flex items-center justify-center mb-4 shadow-xs">
              <Calendar className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1.5">
              {ja.shift.noShift}
            </h2>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              {ja.shift.noShiftSubtitle}
            </p>

            <div className="flex flex-col gap-3 w-full">
              <button
                type="button"
                onClick={() => setIsWizardOpen(true)}
                aria-label={ja.shift.createShift}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#0F2A66] hover:bg-[#0c2252] active:bg-[#0a1a40] text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-all min-h-[48px]"
              >
                <Plus className="w-5 h-5" />
                <span>{ja.shift.createShift}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyPreviousShift}
                disabled={isPending}
                className="w-full py-3.5 px-4 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-semibold text-sm shadow-2xs flex items-center justify-center gap-2 transition-all min-h-[48px] disabled:opacity-50"
              >
                <Copy className="w-4 h-4 text-[#0F2A66]" />
                <span>{ja.shift.copyPreviousDay}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Shift Exists View */
          <div className="w-full flex flex-col items-center">
            {/* Top Toolbar */}
            <div className="w-full max-w-5xl px-4 py-2.5 flex items-center justify-between gap-2 shrink-0">
              {/* Segmented Control: シート / リスト */}
              <div className="flex items-center bg-gray-200/80 p-1 rounded-2xl shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('sheet')}
                  className={`p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 min-h-[36px] min-w-[36px] ${
                    viewMode === 'sheet'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label={ja.shift.sheetView}
                  title={ja.shift.sheetView}
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#0F2A66]" />
                  <span className="hidden sm:inline">{ja.shift.sheetView}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 min-h-[36px] min-w-[36px] ${
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label={ja.shift.listView}
                  title={ja.shift.listView}
                >
                  <ListFilter className="w-4 h-4 text-[#0F2A66]" />
                  <span className="hidden sm:inline">{ja.shift.listView}</span>
                </button>
              </div>

              {/* Center / Right controls */}
              <div className="flex items-center gap-2">
                {viewMode === 'sheet' && (
                  <ZoomControls
                    zoomPercent={zoomPercent}
                    onZoomChange={setZoomPercent}
                    onResetZoom={() => setZoomPercent(calculateFitToWidth())}
                  />
                )}

                <ExportMenu shiftDate={currentDate} />

                {/* More ⋯ Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                    className="p-2 rounded-2xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100 shadow-2xs min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                    aria-label={ja.common.actions}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {showMenuDropdown && (
                    <div
                      className="absolute right-0 mt-2 w-48 rounded-2xl bg-white shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 divide-y divide-gray-100"
                      onClick={() => setShowMenuDropdown(false)}
                    >
                      <button
                        type="button"
                        onClick={() => setIsHeaderModalOpen(true)}
                        className="w-full px-4 py-3 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                      >
                        <Edit className="w-4 h-4 text-[#0F2A66]" />
                        <span>{ja.shift.editHeader}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowShiftDeleteConfirm(true)}
                        className="w-full px-4 py-3 text-left text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                        <span>{ja.shift.deleteShift}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* View container */}
            <div className="w-full flex-1 flex flex-col items-center">
              {viewMode === 'sheet' && sheetModel ? (
                <ShiftSheetPreview
                  model={sheetModel}
                  zoomPercent={zoomPercent}
                  onZoomChange={setZoomPercent}
                  onRowClick={handlePreviewRowClick}
                />
              ) : (
                <div className="w-full py-4">
                  <EmployeeList
                    employees={shift.employees}
                    onEdit={(emp) => setEditingEmployee(emp)}
                    onDelete={(emp) => setEmployeeToDelete(emp)}
                    onMoveUp={(idx) => handleMoveEmployee(idx, idx - 1)}
                    onMoveDown={(idx) => handleMoveEmployee(idx, idx + 1)}
                    onAddStaff={() => setIsAddStaffSheetOpen(true)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Large Floating + Button at bottom center above tab bar */}
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <button
            type="button"
            onClick={() => (shift ? setIsAddStaffSheetOpen(true) : setIsWizardOpen(true))}
            className="pointer-events-auto h-14 px-6 rounded-full bg-[#0F2A66] hover:bg-[#0c2252] active:bg-[#0a1a40] text-white font-bold shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            aria-label={shift ? ja.shift.addStaff : ja.shift.createShift}
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
            <span className="text-sm tracking-wide">
              {shift ? ja.shift.addStaff : ja.shift.createShift}
            </span>
          </button>
        </div>
      </div>

      {/* Shift Creation Wizard */}
      <ShiftCreationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        shiftDate={currentDate}
        defaultHeaderSnapshot={defaultCompanySettings}
        defaultDesignSnapshot={defaultDesignSettings}
        onSuccess={() => {
          loadDateData(currentDate);
          refreshShiftDots(currentDate);
        }}
      />

      {/* Header Edit Modal */}
      {shift && (
        <HeaderEditModal
          isOpen={isHeaderModalOpen}
          onClose={() => setIsHeaderModalOpen(false)}
          shiftId={shift.id}
          initialHeader={shift.header_snapshot}
          onSuccess={() => loadDateData(currentDate)}
        />
      )}

      {/* Add Employee BottomSheet */}
      {shift && (
        <BottomSheet
          isOpen={isAddStaffSheetOpen}
          onClose={() => setIsAddStaffSheetOpen(false)}
          title={ja.employee.newTitle}
        >
          <EmployeeForm
            onSave={handleAddEmployeeSave}
            onCancel={() => setIsAddStaffSheetOpen(false)}
            existingCodes={shift.employees.map((e) => e.employee_code).filter(Boolean) as string[]}
          />
        </BottomSheet>
      )}

      {/* Edit Employee BottomSheet */}
      {editingEmployee && shift && (
        <BottomSheet
          isOpen={true}
          onClose={() => setEditingEmployee(null)}
          title={ja.employee.editTitle}
        >
          <EmployeeForm
            initialData={editingEmployee}
            onSave={handleUpdateEmployeeSave}
            onDelete={() => setEmployeeToDelete(editingEmployee)}
            onMoveUp={() => {
              const idx = shift.employees.findIndex((e) => e.id === editingEmployee.id);
              if (idx > 0) handleMoveEmployee(idx, idx - 1);
            }}
            onMoveDown={() => {
              const idx = shift.employees.findIndex((e) => e.id === editingEmployee.id);
              if (idx < shift.employees.length - 1) handleMoveEmployee(idx, idx + 1);
            }}
            canMoveUp={shift.employees.findIndex((e) => e.id === editingEmployee.id) > 0}
            canMoveDown={
              shift.employees.findIndex((e) => e.id === editingEmployee.id) <
              shift.employees.length - 1
            }
            onCancel={() => setEditingEmployee(null)}
            existingCodes={
              shift.employees
                .filter((e) => e.id !== editingEmployee.id)
                .map((e) => e.employee_code)
                .filter(Boolean) as string[]
            }
          />
        </BottomSheet>
      )}

      {/* Delete Shift Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showShiftDeleteConfirm}
        title={ja.shift.deleteShift}
        message={ja.shift.deleteShiftConfirm}
        confirmLabel={ja.common.delete}
        cancelLabel={ja.common.cancel}
        isDestructive={true}
        onConfirm={handleDeleteShift}
        onCancel={() => setShowShiftDeleteConfirm(false)}
      />

      {/* Delete Employee Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(employeeToDelete)}
        title={ja.common.delete}
        message={ja.employee.deleteStaffConfirm(employeeToDelete?.employee_name || '')}
        confirmLabel={ja.common.delete}
        cancelLabel={ja.common.cancel}
        isDestructive={true}
        onConfirm={handleConfirmDeleteEmployee}
        onCancel={() => setEmployeeToDelete(null)}
      />
    </div>
  );
}
