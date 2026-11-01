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

  let shift = null;
  try {
    shift = getShiftByDate(date);
  } catch {
    // Server database might not exist on serverless deployments
  }

  if (!shift) {
    // Redirect to client-side vector print page which loads from client IndexedDB / localStorage
    return NextResponse.redirect(new URL(`/print/${date}?autoprint=1`, request.url));
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
  } catch {
    // Graceful fallback to client-side print view if Chromium fails in serverless environment
    return NextResponse.redirect(new URL(`/print/${date}?autoprint=1`, request.url));
  }
}
