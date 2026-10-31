-- Initial schema for Japanese Daily Shift Sheet App

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
