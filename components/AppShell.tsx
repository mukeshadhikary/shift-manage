'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShiftWithEmployees,
  HeaderSnapshot,
  DesignSnapshot,
} from '@/lib/types';
import { ja } from '@/lib/i18n/ja';
import { MainShiftView } from './MainShiftView';
import { HistoryView } from './history/HistoryView';
import { SettingsView } from './settings/SettingsView';
import { Calendar, History, Settings } from 'lucide-react';
import { DEFAULT_HEADER_SNAPSHOT, DEFAULT_DESIGN_SNAPSHOT } from '@/lib/defaults';
import { getCompanySettings, getDesignSettings } from '@/lib/db/idb';

interface AppShellProps {
  initialDate: string;
  initialTab: 'shift' | 'history' | 'settings';
  initialShift?: ShiftWithEmployees | null;
  companySettings?: HeaderSnapshot;
  designSettings?: DesignSnapshot;
  defaultCompanySettings?: HeaderSnapshot;
  defaultDesignSettings?: DesignSnapshot;
  initialShiftDates?: string[];
  initialAllShifts?: Array<{
    id: number;
    shift_date: string;
    staff_count: number;
    nicknames: string[];
  }>;
}

export function AppShell({
  initialDate,
  initialTab,
  initialShift = null,
  companySettings,
  designSettings,
  defaultCompanySettings = DEFAULT_HEADER_SNAPSHOT,
  defaultDesignSettings = DEFAULT_DESIGN_SNAPSHOT,
  initialShiftDates = [],
  initialAllShifts = [],
}: AppShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeCompany, setActiveCompany] = useState<HeaderSnapshot>(
    companySettings || defaultCompanySettings
  );
  const [activeDesign, setActiveDesign] = useState<DesignSnapshot>(
    designSettings || defaultDesignSettings
  );

  useEffect(() => {
    getCompanySettings().then(setActiveCompany);
    getDesignSettings().then(setActiveDesign);
  }, []);

  const tabParam = searchParams.get('tab');
  const activeTab: 'shift' | 'history' | 'settings' =
    tabParam && ['shift', 'history', 'settings'].includes(tabParam)
      ? (tabParam as 'shift' | 'history' | 'settings')
      : initialTab;

  const dateParam = searchParams.get('date');
  const selectedDate: string =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : initialDate;

  const handleTabChange = (tab: 'shift' | 'history' | 'settings') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  const handleSelectDateFromHistory = (date: string) => {
    const params = new URLSearchParams();
    params.set('date', date);
    params.set('tab', 'shift');
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  // Block native iOS Safari gesture zoom in across the app
  useEffect(() => {
    const blockGesture = (e: Event) => {
      e.preventDefault();
    };
    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend', blockGesture, { passive: false });
    return () => {
      document.removeEventListener('gesturestart', blockGesture);
      document.removeEventListener('gesturechange', blockGesture);
      document.removeEventListener('gestureend', blockGesture);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F7]">
      {/* Top App Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#0F2A66] rounded-full inline-block" />
            <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
              {ja.app.title}
            </h1>
          </div>

          {/* Desktop Top Segmented Control */}
          <nav className="hidden sm:flex items-center bg-gray-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => handleTabChange('shift')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[36px] ${
                activeTab === 'shift'
                  ? 'bg-white text-[#0F2A66] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>{ja.nav.shift}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('history')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[36px] ${
                activeTab === 'history'
                  ? 'bg-white text-[#0F2A66] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>{ja.nav.history}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('settings')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[36px] ${
                activeTab === 'settings'
                  ? 'bg-white text-[#0F2A66] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>{ja.nav.settings}</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main View Container */}
      <main className="flex-1 flex flex-col items-center w-full">
        {activeTab === 'shift' && (
          <MainShiftView
            key={selectedDate}
            initialDate={selectedDate}
            initialShift={selectedDate === initialDate ? initialShift : null}
            defaultCompanySettings={activeCompany}
            defaultDesignSettings={activeDesign}
            initialShiftDates={initialShiftDates}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            initialShifts={initialAllShifts}
            onSelectDate={handleSelectDateFromHistory}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            initialCompanySettings={activeCompany}
            initialDesignSettings={activeDesign}
            currentDateShiftId={initialShift?.shift_date === selectedDate ? initialShift?.id : null}
            currentDate={selectedDate}
          />
        )}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-200/80 px-6 py-2 flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => handleTabChange('shift')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 min-h-[48px] transition-colors ${
            activeTab === 'shift' ? 'text-[#0F2A66] font-bold' : 'text-gray-400'
          }`}
        >
          <Calendar className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] leading-tight">{ja.nav.shift}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('history')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 min-h-[48px] transition-colors ${
            activeTab === 'history' ? 'text-[#0F2A66] font-bold' : 'text-gray-400'
          }`}
        >
          <History className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] leading-tight">{ja.nav.history}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('settings')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 min-h-[48px] transition-colors ${
            activeTab === 'settings' ? 'text-[#0F2A66] font-bold' : 'text-gray-400'
          }`}
        >
          <Settings className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] leading-tight">{ja.nav.settings}</span>
        </button>
      </nav>
    </div>
  );
}
