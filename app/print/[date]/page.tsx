export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import React from 'react';
import { notFound } from 'next/navigation';
import { PrintClientView } from './PrintClientView';

interface PrintPageProps {
  params: Promise<{ date: string }>;
  searchParams?: Promise<{ autoprint?: string }>;
}

export default async function PrintPage({ params, searchParams }: PrintPageProps) {
  const { date } = await params;
  const search = searchParams ? await searchParams : {};
  const autoPrint = search.autoprint === '1';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound();
  }

  return (
    <PrintClientView
      date={date}
      serverShift={null}
      autoPrint={autoPrint}
    />
  );
}
