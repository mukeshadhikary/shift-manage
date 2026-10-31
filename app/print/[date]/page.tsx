export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import React from 'react';
import { notFound } from 'next/navigation';
import { getShiftByDate } from '@/lib/db/repository';
import { buildSheetModel } from '@/lib/sheet';
import { ShiftSheetPreview } from '@/components/sheet/ShiftSheetPreview';

interface PrintPageProps {
  params: Promise<{ date: string }>;
}

export default async function PrintPage({ params }: PrintPageProps) {
  const { date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound();
  }

  const shift = getShiftByDate(date);
  if (!shift) {
    notFound();
  }

  const model = buildSheetModel(shift, shift.header_snapshot, shift.design_snapshot);

  return (
    <main className="bg-white min-h-screen">
      <ShiftSheetPreview model={model} zoomPercent={100} isPrint={true} />
    </main>
  );
}
