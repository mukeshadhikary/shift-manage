export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getShiftByDate } from '@/lib/db/repository';
import { generateShiftPdf } from '@/lib/export/pdf';

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
    const url = new URL(request.url);
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
    const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'http';
    const serverOrigin = `${proto}://${host}`;

    const pdfBuffer = await generateShiftPdf(date, serverOrigin);

    const japaneseFilename = `${date}_勤務シフト表.pdf`;
    const asciiFallback = `${date}_shift.pdf`;
    const encodedFilename = encodeURIComponent(japaneseFilename);

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'PDFの生成に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
