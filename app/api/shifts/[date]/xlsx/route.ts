export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getShiftByDate } from '@/lib/db/repository';
import { buildSheetModel } from '@/lib/sheet';
import { generateShiftExcelWorkbook } from '@/lib/export/excel';

interface RouteContext {
  params: Promise<{ date: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { date } = await context.params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: '無効な日付形式です (YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  const shift = getShiftByDate(date);
  if (!shift) {
    return NextResponse.json(
      { error: `指定された日付 (${date}) のシフト表が見つかりません。` },
      { status: 404 }
    );
  }

  try {
    const model = buildSheetModel(shift, shift.header_snapshot, shift.design_snapshot);
    const workbook = await generateShiftExcelWorkbook(model);

    const buffer = await workbook.xlsx.writeBuffer();

    const japaneseFilename = `${date}_勤務シフト表.xlsx`;
    const asciiFallback = `${date}_shift.xlsx`;
    const encodedFilename = encodeURIComponent(japaneseFilename);

    return new Response(new Uint8Array(buffer as ArrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Excelの生成に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
