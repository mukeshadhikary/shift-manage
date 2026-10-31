'use client';

import React from 'react';
import { ShiftEmployee } from '@/lib/types';
import { ja } from '@/lib/i18n/ja';
import { formatTimeHM } from '@/lib/date';
import { Edit2, Trash2, ArrowUp, ArrowDown, User, Plus } from 'lucide-react';

interface EmployeeListProps {
  employees: ShiftEmployee[];
  onEdit: (employee: ShiftEmployee) => void;
  onDelete: (employee: ShiftEmployee) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onAddStaff: () => void;
}

export function EmployeeList({
  employees,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddStaff,
}: EmployeeListProps) {
  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-xs border border-gray-100 text-center">
        <User className="w-12 h-12 text-gray-300 mb-2" />
        <p className="text-gray-500 font-medium text-sm">{ja.employee.noStaff}</p>
        <button
          type="button"
          onClick={onAddStaff}
          className="mt-4 px-4 py-2.5 rounded-2xl bg-[#0F2A66] text-white text-sm font-semibold flex items-center gap-1.5 shadow-md hover:bg-[#0c2252] transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{ja.shift.addStaff}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-xl mx-auto px-2 pb-24">
      {employees.map((emp, index) => {
        const canMoveUp = index > 0;
        const canMoveDown = index < employees.length - 1;

        return (
          <div
            key={emp.id}
            className="flex flex-col p-4 bg-white rounded-2xl shadow-xs border border-gray-100 hover:border-gray-200 transition-all text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-50 text-[#0F2A66] text-xs font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-gray-900">{emp.employee_name}</span>
                    {emp.employee_code && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-mono">
                        {emp.employee_code}
                      </span>
                    )}
                  </div>
                  {emp.nickname && (
                    <span className="text-xs text-gray-500">（{emp.nickname}）</span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onMoveUp(index)}
                  disabled={!canMoveUp}
                  className="p-2 text-gray-400 hover:text-gray-700 disabled:opacity-20 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={ja.common.moveUp}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveDown(index)}
                  disabled={!canMoveDown}
                  className="p-2 text-gray-400 hover:text-gray-700 disabled:opacity-20 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={ja.common.moveDown}
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(emp)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={ja.common.edit}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(emp)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={ja.common.delete}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Time & Details bar */}
            <div className="mt-3 pt-2.5 border-t border-gray-100 grid grid-cols-3 gap-2 text-xs text-gray-600">
              <div>
                <span className="text-gray-400 block text-[10px]">{ja.employee.plannedTime}</span>
                <span className="font-medium text-gray-800">
                  {emp.planned_start_time ? formatTimeHM(emp.planned_start_time) : '--:--'} 〜{' '}
                  {emp.planned_end_time ? formatTimeHM(emp.planned_end_time) : '--:--'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">{ja.employee.breakTime}</span>
                <span className="font-medium text-gray-800">
                  {emp.break_time ? formatTimeHM(emp.break_time) : ja.common.none}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">{ja.employee.lockerLabel}</span>
                <span className="font-medium text-gray-800">
                  {emp.locker_number || ja.common.none}
                </span>
              </div>
            </div>

            {emp.remarks && (
              <div className="mt-2 text-xs text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                {ja.employee.remarksLabel}: {emp.remarks}
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAddStaff}
        className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-gray-300 text-[#0F2A66] font-semibold text-sm hover:border-[#0F2A66] hover:bg-blue-50/50 active:bg-blue-100/50 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
      >
        <Plus className="w-4 h-4" />
        <span>{ja.shift.addStaff}</span>
      </button>
    </div>
  );
}
