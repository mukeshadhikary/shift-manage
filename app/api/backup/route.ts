export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import fs from 'fs';
import path from 'path';
import os from 'os';
import { NextResponse } from 'next/server';
import { getTodayJST } from '@/lib/date';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const tempDir = os.tmpdir();
  const today = getTodayJST();
  const tempBackupPath = path.join(tempDir, `shift_backup_${Date.now()}_${today}.db`);

  try {
    // Hot SQLite backup with VACUUM INTO safely checkpoints WAL and creates consistent snapshot
    db.prepare('VACUUM INTO ?').run(tempBackupPath);
    const fileBuffer = fs.readFileSync(tempBackupPath);
    try {
      fs.unlinkSync(tempBackupPath);
    } catch {
      // ignore cleanup errors
    }

    const filename = `shift_backup_${today}.db`;

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: unknown) {
    if (fs.existsSync(tempBackupPath)) {
      try {
        fs.unlinkSync(tempBackupPath);
      } catch {
        // ignore
      }
    }
    const message = err instanceof Error ? err.message : 'バックアップの生成に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
