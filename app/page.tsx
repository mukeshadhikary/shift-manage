export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import React from 'react';
import { getTodayJST } from '@/lib/date';
import { ToastProvider } from '@/components/ui/Toast';
import { AppShell } from '@/components/AppShell';
import { DEFAULT_HEADER_SNAPSHOT, DEFAULT_DESIGN_SNAPSHOT } from '@/lib/defaults';

interface HomePageProps {
  searchParams: Promise<{ date?: string; tab?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { date: paramDate, tab: paramTab } = await searchParams;

  const today = getTodayJST();
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const currentDate = paramDate && dateRegex.test(paramDate) ? paramDate : today;
  const currentTab = paramTab && ['shift', 'history', 'settings'].includes(paramTab) ? paramTab : 'shift';

  return (
    <ToastProvider>
      <AppShell
        initialDate={currentDate}
        initialTab={currentTab as 'shift' | 'history' | 'settings'}
        defaultCompanySettings={DEFAULT_HEADER_SNAPSHOT}
        defaultDesignSettings={DEFAULT_DESIGN_SNAPSHOT}
      />
    </ToastProvider>
  );
}
