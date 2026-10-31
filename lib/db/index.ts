import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import {
  DEFAULT_COMPANY_SETTINGS,
  DEFAULT_DESIGN_SETTINGS,
} from '../defaults';

const DEFAULT_DB_PATH = './data/shift.db';

declare global {
  var __db_instance: Database.Database | undefined;
}

/**
 * Initializes and migrates a better-sqlite3 database.
 */
export function initDatabase(dbPath?: string): Database.Database {
  let targetPath = dbPath || process.env.DATABASE_PATH || DEFAULT_DB_PATH;

  // On Vercel or read-only serverless environments, default to /tmp/shift.db
  if (process.env.VERCEL && !dbPath && !process.env.DATABASE_PATH) {
    targetPath = '/tmp/shift.db';
  }

  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      // Fallback to /tmp if root filesystem is read-only
      targetPath = '/tmp/shift.db';
      const tmpDir = path.dirname(targetPath);
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    }
  }

  const db = new Database(targetPath);

  // Set PRAGMAs
  db.pragma('foreign_keys = ON');
  if (targetPath !== ':memory:') {
    try {
      db.pragma('journal_mode = WAL');
    } catch {
      db.pragma('journal_mode = DELETE');
    }
  }

  // Run migrations
  runMigrations(db);

  // Seed default settings if empty
  seedDefaults(db);

  return db;
}

/**
 * Applies SQL migration files tracked by PRAGMA user_version.
 */
function runMigrations(db: Database.Database): void {
  const currentVersionRow = db.prepare('PRAGMA user_version').get() as { user_version: number };
  let currentVersion = currentVersionRow ? currentVersionRow.user_version : 0;

  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    // If running in bundled/transpiled environments, fallback to inline 001 migration
    applyMigration001(db);
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const versionMatch = file.match(/^(\d+)_/);
    if (!versionMatch) continue;
    const fileVersion = parseInt(versionMatch[1], 10);

    if (fileVersion > currentVersion) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const applyTx = db.transaction(() => {
        db.exec(sql);
        db.pragma(`user_version = ${fileVersion}`);
      });
      applyTx();
      currentVersion = fileVersion;
    }
  }
}

function applyMigration001(db: Database.Database): void {
  const currentVersionRow = db.prepare('PRAGMA user_version').get() as { user_version: number };
  const currentVersion = currentVersionRow ? currentVersionRow.user_version : 0;
  if (currentVersion >= 1) return;

  const sql = `
    CREATE TABLE IF NOT EXISTS daily_shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_date TEXT NOT NULL UNIQUE,
      header_snapshot TEXT NOT NULL,
      design_snapshot TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shift_employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id INTEGER NOT NULL REFERENCES daily_shifts(id) ON DELETE CASCADE,
      display_order INTEGER NOT NULL,
      employee_code TEXT,
      employee_name TEXT NOT NULL,
      nickname TEXT,
      remarks TEXT,
      planned_start_time TEXT,
      actual_start_time TEXT,
      planned_end_time TEXT,
      break_time TEXT,
      locker_number TEXT,
      signature TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_shift_employees_order ON shift_employees (shift_id, display_order);

    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      company_name TEXT NOT NULL,
      document_title TEXT NOT NULL,
      fax_number TEXT NOT NULL,
      manager_name TEXT NOT NULL,
      transmission_instructions TEXT NOT NULL,
      vertical_instructions TEXT NOT NULL,
      approval_title TEXT NOT NULL,
      approval_position TEXT NOT NULL,
      column_labels TEXT NOT NULL,
      additional_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS design_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      header_color TEXT NOT NULL,
      table_header_color TEXT NOT NULL,
      row_color_odd TEXT NOT NULL,
      row_color_even TEXT NOT NULL,
      font_scale INTEGER NOT NULL,
      row_height_mm REAL NOT NULL,
      column_widths TEXT NOT NULL,
      margins TEXT NOT NULL,
      additional_settings TEXT NOT NULL
    );
  `;

  const tx = db.transaction(() => {
    db.exec(sql);
    db.pragma('user_version = 1');
  });
  tx();
}

/**
 * Seeds default settings rows if not already present.
 */
function seedDefaults(db: Database.Database): void {
  // Check company_settings
  const companyCount = db.prepare('SELECT COUNT(*) as count FROM company_settings WHERE id = 1').get() as { count: number };
  if (companyCount.count === 0) {
    db.prepare(`
      INSERT INTO company_settings (
        id, company_name, document_title, fax_number, manager_name,
        transmission_instructions, vertical_instructions, approval_title,
        approval_position, column_labels, additional_notes
      ) VALUES (
        1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).run(
      DEFAULT_COMPANY_SETTINGS.company_name,
      DEFAULT_COMPANY_SETTINGS.document_title,
      DEFAULT_COMPANY_SETTINGS.fax_number,
      DEFAULT_COMPANY_SETTINGS.manager_name,
      DEFAULT_COMPANY_SETTINGS.transmission_instructions,
      DEFAULT_COMPANY_SETTINGS.vertical_instructions,
      DEFAULT_COMPANY_SETTINGS.approval_title,
      DEFAULT_COMPANY_SETTINGS.approval_position,
      JSON.stringify(DEFAULT_COMPANY_SETTINGS.column_labels),
      DEFAULT_COMPANY_SETTINGS.additional_notes
    );
  }

  // Check design_settings
  const designCount = db.prepare('SELECT COUNT(*) as count FROM design_settings WHERE id = 1').get() as { count: number };
  if (designCount.count === 0) {
    db.prepare(`
      INSERT INTO design_settings (
        id, header_color, table_header_color, row_color_odd, row_color_even,
        font_scale, row_height_mm, column_widths, margins, additional_settings
      ) VALUES (
        1, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).run(
      DEFAULT_DESIGN_SETTINGS.header_color,
      DEFAULT_DESIGN_SETTINGS.table_header_color,
      DEFAULT_DESIGN_SETTINGS.row_color_odd,
      DEFAULT_DESIGN_SETTINGS.row_color_even,
      DEFAULT_DESIGN_SETTINGS.font_scale,
      DEFAULT_DESIGN_SETTINGS.row_height_mm,
      JSON.stringify(DEFAULT_DESIGN_SETTINGS.column_widths),
      JSON.stringify(DEFAULT_DESIGN_SETTINGS.margins),
      JSON.stringify(DEFAULT_DESIGN_SETTINGS.additional_settings)
    );
  }
}

/**
 * Returns the singleton DB instance (hot-reload safe).
 */
export function getDb(): Database.Database {
  if (!globalThis.__db_instance) {
    globalThis.__db_instance = initDatabase();
  }
  return globalThis.__db_instance;
}
