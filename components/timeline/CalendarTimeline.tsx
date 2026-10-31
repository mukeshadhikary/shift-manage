'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  getTodayJST,
  generateDateRange,
  getShortWeekdayJST,
  getDayNumber,
  isSaturday,
  isSundayOrHoliday,
  addDays,
} from '@/lib/date';
import { ja } from '@/lib/i18n/ja';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { MonthPickerModal } from './MonthPickerModal';

interface CalendarTimelineProps {
  selectedDate: string;
  shiftDates: string[]; // dates that have shifts
  onSelectDate: (date: string) => void;
}

export function CalendarTimeline({
  selectedDate,
  shiftDates,
  onSelectDate,
}: CalendarTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedPillRef = useRef<HTMLButtonElement>(null);
  const today = getTodayJST();
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  // Generate range: 30 days before selectedDate to 30 days after
  const dates = generateDateRange(selectedDate, 30, 30);
  const shiftDatesSet = new Set(shiftDates);

  // Auto-scroll selected date to center
  useEffect(() => {
    if (selectedPillRef.current && scrollContainerRef.current) {
      selectedPillRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedDate]);

  const handlePrevDay = () => {
    onSelectDate(addDays(selectedDate, -1));
  };

  const handleNextDay = () => {
    onSelectDate(addDays(selectedDate, 1));
  };

  const handleToday = () => {
    onSelectDate(today);
  };

  return (
    <div className="w-full bg-white border-b border-gray-200/80 shadow-xs shrink-0 select-none">
      {/* Controls Bar: 前日 / 今日 / 翌日 & Month Picker */}
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevDay}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors flex items-center gap-0.5 min-h-[44px]"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{ja.common.prevDay}</span>
          </button>

          <button
            type="button"
            onClick={handleToday}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors min-h-[44px] ${
              selectedDate === today
                ? 'bg-[#0F2A66] text-white shadow-xs'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300'
            }`}
          >
            {ja.common.today}
          </button>

          <button
            type="button"
            onClick={handleNextDay}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors flex items-center gap-0.5 min-h-[44px]"
          >
            <span>{ja.common.nextDay}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsMonthPickerOpen(true)}
          className="p-2 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={ja.shift.viewMonthPicker}
        >
          <CalendarIcon className="w-5 h-5 text-[#0F2A66]" />
        </button>
      </div>

      {/* Horizontal Scrolling Timeline Strip */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2 overflow-x-auto py-2.5 px-4 scrollbar-none overscroll-x-contain"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {dates.map((dateStr) => {
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          const hasShift = shiftDatesSet.has(dateStr);
          const weekday = getShortWeekdayJST(dateStr);
          const dayNum = getDayNumber(dateStr);
          const sat = isSaturday(dateStr);
          const sunOrHol = isSundayOrHoliday(dateStr);

          // Weekday text color
          let weekdayColorClass = 'text-gray-500';
          if (!isSelected) {
            if (sunOrHol) weekdayColorClass = 'text-red-500 font-semibold';
            else if (sat) weekdayColorClass = 'text-blue-500 font-semibold';
          } else {
            weekdayColorClass = 'text-white/80';
          }

          return (
            <button
              key={dateStr}
              ref={isSelected ? selectedPillRef : null}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={`relative flex flex-col items-center justify-center shrink-0 w-12 py-2 rounded-2xl transition-all duration-150 min-h-[58px] ${
                isSelected
                  ? 'bg-[#0F2A66] text-white shadow-md font-semibold scale-105'
                  : 'bg-transparent text-gray-900 hover:bg-gray-100/80 active:bg-gray-200'
              } ${isToday && !isSelected ? 'ring-2 ring-[#0F2A66]/30 bg-blue-50/40' : ''}`}
            >
              {/* Today Badge */}
              {isToday && (
                <span
                  className={`text-[9px] font-bold tracking-tight leading-none mb-0.5 ${
                    isSelected ? 'text-amber-300' : 'text-[#0F2A66]'
                  }`}
                >
                  {ja.common.today}
                </span>
              )}

              {/* Weekday */}
              <span className={`text-[11px] leading-tight ${weekdayColorClass}`}>
                {weekday}
              </span>

              {/* Day Number */}
              <span className="text-base font-bold leading-tight mt-0.5">
                {dayNum}
              </span>

              {/* Shift Dot indicator */}
              <div className="h-1.5 flex items-center justify-center mt-0.5">
                {hasShift && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-amber-300' : 'bg-[#0F2A66]'
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <MonthPickerModal
        isOpen={isMonthPickerOpen}
        onClose={() => setIsMonthPickerOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />
    </div>
  );
}
