export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import React from 'react';
import { getTodayJST, addDays } from '@/lib/date';
import {
  getShiftByDate,
  getCompanySettings,
  getDesignSettings,
  listShiftDatesInRange,
  listAllShifts,
} from '@/lib/db/repository';
import { ToastProvider } from '@/components/ui/Toast';
import { AppShell } from '@/components/AppShell';

interface HomePageProps {
  searchParams: Promise<{ date?: string; tab?: string }>;
}


export default async function HomePage({ searchParams }: HomePageProps) {
  const { date: paramDate, tab: paramTab } = await searchParams;

  const today = getTodayJST();
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const currentDate = paramDate && dateRegex.test(paramDate) ? paramDate : today;
  const currentTab = paramTab && ['shift', 'history', 'settings'].includes(paramTab) ? paramTab : 'shift';

  // Fetch initial data on server
  const shift = getShiftByDate(currentDate);
  const companySettings = getCompanySettings();
  const designSettings = getDesignSettings();

  const startDate = addDays(currentDate, -30);
  const endDate = addDays(currentDate, 30);
  const shiftDates = listShiftDatesInRange(startDate, endDate);
  const allShifts = listAllShifts();

  return (
    <ToastProvider>
      <AppShell
        initialDate={currentDate}
        initialTab={currentTab as 'shift' | 'history' | 'settings'}
        initialShift={shift}
        companySettings={companySettings}
        designSettings={designSettings}
        initialShiftDates={shiftDates}
        initialAllShifts={allShifts}
      />
    </ToastProvider>
  );
}
