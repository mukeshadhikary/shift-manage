'use client';

import React, { useState, useTransition } from 'react';
import { ja } from '@/lib/i18n/ja';
import { formatJapaneseDate, getWeekdayJST, isSundayOrHoliday, isSaturday } from '@/lib/date';
import { Calendar, Trash2, ChevronRight, Users, Clock } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '../ui/Toast';
import { deleteShiftAction } from '@/app/actions';

interface ShiftHistoryItem {
  id: number;
  shift_date: string;
  staff_count: number;
  nicknames: string[];
}

interface HistoryViewProps {
  initialShifts: ShiftHistoryItem[];
  onSelectDate: (date: string) => void;
}

export function HistoryView({ initialShifts, onSelectDate }: HistoryViewProps) {
  const { showToast } = useToast();
  const [shifts, setShifts] = useState<ShiftHistoryItem[]>(initialShifts);
  const [shiftToDelete, setShiftToDelete] = useState<ShiftHistoryItem | null>(null);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [isPending, startTransition] = useTransition();

  // Group shifts by year-month (e.g. "2026-10")
  const groupedByMonth: Record<string, ShiftHistoryItem[]> = {};
  for (const s of shifts) {
    const ym = s.shift_date.substring(0, 7);
    if (!groupedByMonth[ym]) groupedByMonth[ym] = [];
    groupedByMonth[ym].push(s);
  }

  const availableMonths = Object.keys(groupedByMonth).sort().reverse();

  const filteredMonths =
    selectedMonthFilter === 'all'
      ? availableMonths
      : availableMonths.filter((m) => m === selectedMonthFilter);

  const handleDeleteShift = async () => {
    if (!shiftToDelete) return;
    const target = shiftToDelete;
    setShiftToDelete(null);

    startTransition(async () => {
      const res = await deleteShiftAction(target.id, target.shift_date);
      if (res.success) {
        showToast(ja.toasts.deleted, 'success');
        setShifts((prev) => prev.filter((s) => s.id !== target.id));
      } else {
        showToast(res.error, 'error');
      }
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-28 flex flex-col gap-6 text-left">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{ja.history.title}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{ja.history.subtitle}</p>
        </div>

        {/* Month Filter */}
        {availableMonths.length > 1 && (
          <div className="flex items-center gap-2">
            <select
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 min-h-[44px] focus:outline-none focus:border-[#0F2A66]"
            >
              <option value="all">{ja.history.allMonths(shifts.length)}</option>
              {availableMonths.map((ym) => {
                const [y, m] = ym.split('-');
                return (
                  <option key={ym} value={ym}>
                    {ja.history.monthLabel(y, parseInt(m, 10), groupedByMonth[ym].length)}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {shifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-xs border border-gray-100 text-center my-8">
          <Clock className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium text-sm">{ja.history.empty}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {filteredMonths.map((ym) => {
            const [y, m] = ym.split('-');
            const monthShifts = groupedByMonth[ym];

            return (
              <div key={ym} className="flex flex-col gap-2.5">
                <div className="text-xs font-bold text-gray-400 px-1 tracking-wider uppercase">
                  {ja.history.yearMonthHeader(y, parseInt(m, 10))}
                </div>

                <div className="bg-white rounded-3xl shadow-xs border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                  {monthShifts.map((s) => {
                    const formattedDate = formatJapaneseDate(s.shift_date);
                    const weekday = getWeekdayJST(s.shift_date);
                    const isHoliday = isSundayOrHoliday(s.shift_date);
                    const isSat = isSaturday(s.shift_date);

                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-4 hover:bg-gray-50/80 active:bg-gray-100 transition-colors group"
                      >
                        {/* Tap to open shift */}
                        <button
                          type="button"
                          onClick={() => onSelectDate(s.shift_date)}
                          className="flex-1 flex items-center gap-3.5 text-left focus:outline-none min-h-[44px]"
                        >
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0F2A66] flex items-center justify-center font-bold text-sm shrink-0">
                            <Calendar className="w-5 h-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base text-gray-900">
                                {formattedDate}
                              </span>
                              <span
                                className={`text-xs font-semibold ${
                                  isHoliday
                                    ? 'text-red-500'
                                    : isSat
                                    ? 'text-blue-500'
                                    : 'text-gray-500'
                                }`}
                              >
                                {weekday}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 truncate">
                              <span className="inline-flex items-center gap-1 font-medium text-gray-700 shrink-0">
                                <Users className="w-3.5 h-3.5 text-gray-400" />
                                {ja.history.staffCountLabel(s.staff_count)}
                              </span>
                              {s.nicknames.length > 0 && (
                                <span className="text-gray-400 truncate">
                                  （{s.nicknames.join(', ')}）
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                        </button>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => setShiftToDelete(s)}
                          disabled={isPending}
                          className="p-2 ml-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-30"
                          aria-label={ja.common.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(shiftToDelete)}
        title={ja.shift.deleteShift}
        message={ja.history.deleteConfirm}
        confirmLabel={ja.common.delete}
        cancelLabel={ja.common.cancel}
        isDestructive={true}
        onConfirm={handleDeleteShift}
        onCancel={() => setShiftToDelete(null)}
      />
    </div>
  );
}
