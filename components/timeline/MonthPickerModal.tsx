'use client';

import React, { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ja } from '@/lib/i18n/ja';
import { parseDateParts } from '@/lib/date';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function MonthPickerModal({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
}: MonthPickerModalProps) {
  const parts = parseDateParts(selectedDate);
  const [viewYear, setViewYear] = useState(parts.year);
  const [viewMonth, setViewMonth] = useState(parts.month);

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Days in month
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
  // First day of month weekday (0 = Sun .. 6 = Sat)
  const firstDow = new Date(Date.UTC(viewYear, viewMonth - 1, 1)).getUTCDay();

  const handleDayClick = (day: number) => {
    const formatted = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelectDate(formatted);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={ja.shift.viewMonthPicker}>
      <div className="flex flex-col items-center">
        {/* Year Month Header Switcher */}
        <div className="flex items-center justify-between w-full max-w-xs mb-4 px-2">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 rounded-full hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-700"
            aria-label={ja.timeline.prevMonth}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="font-semibold text-base text-gray-900">
            {ja.timeline.monthHeader(viewYear, viewMonth)}
          </div>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 rounded-full hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-700"
            aria-label={ja.timeline.nextMonth}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1 w-full max-w-xs text-center text-xs font-medium text-gray-500 mb-2">
          <div className="text-red-500">日</div>
          <div>月</div>
          <div>火</div>
          <div>水</div>
          <div>木</div>
          <div>金</div>
          <div className="text-blue-500">土</div>
        </div>

        <div className="grid grid-cols-7 gap-1 w-full max-w-xs">
          {Array.from({ length: firstDow }, (_, i) => (
            <div key={`empty-${i}`} className="h-10" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = dateStr === selectedDate;
            const dow = (firstDow + i) % 7;
            const isWeekend = dow === 0 ? 'text-red-600' : dow === 6 ? 'text-blue-600' : 'text-gray-900';

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDayClick(day)}
                className={`h-10 rounded-full flex flex-col items-center justify-center text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-[#0F2A66] text-white shadow-md font-semibold'
                    : `hover:bg-gray-100 active:bg-gray-200 ${isWeekend}`
                }`}
              >
                <span>{day}</span>
              </button>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
}
