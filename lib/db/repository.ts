import Database from 'better-sqlite3';
import { getDb } from './index';
import {
  HeaderSnapshot,
  DesignSnapshot,
  ShiftEmployee,
  ShiftWithEmployees,
} from '../types';
import {
  DEFAULT_HEADER_SNAPSHOT,
  DEFAULT_DESIGN_SNAPSHOT,
  DEFAULT_COMPANY_SETTINGS,
  DEFAULT_DESIGN_SETTINGS,
} from '../defaults';
import {
  EmployeeInput,
  employeeInputSchema,
  headerSnapshotSchema,
  designSnapshotSchema,
} from './schema';
import { normalizeColumnWidths } from '../sheet';

export { normalizeColumnWidths };

/**
 * Retrieves current company settings formatted as a HeaderSnapshot.
 */
export function getCompanySettings(db: Database.Database = getDb()): HeaderSnapshot {
  const row = db.prepare('SELECT * FROM company_settings WHERE id = 1').get() as {
    company_name: string;
    document_title: string;
    fax_number: string;
    manager_name: string;
    transmission_instructions: string;
    vertical_instructions: string;
    approval_title: string;
    approval_position: string;
    column_labels: string;
    additional_notes: string | null;
  } | undefined;

  if (!row) return { ...DEFAULT_HEADER_SNAPSHOT };

  return {
    title: row.document_title,
    companyName: row.company_name,
    managerName: row.manager_name,
    faxNumber: row.fax_number,
    transmissionInstructions: row.transmission_instructions,
    verticalInstructions: row.vertical_instructions,
    approvalTitle: row.approval_title,
    approvalPosition: row.approval_position,
    columnLabels: JSON.parse(row.column_labels),
    additionalNotes: row.additional_notes,
  };
}

/**
 * Retrieves current design settings formatted as a DesignSnapshot.
 */
export function getDesignSettings(db: Database.Database = getDb()): DesignSnapshot {
  const row = db.prepare('SELECT * FROM design_settings WHERE id = 1').get() as {
    header_color: string;
    table_header_color: string;
    row_color_odd: string;
    row_color_even: string;
    font_scale: number;
    row_height_mm: number;
    column_widths: string;
    margins: string;
    additional_settings: string;
  } | undefined;

  if (!row) return { ...DEFAULT_DESIGN_SNAPSHOT };

  return {
    headerColor: row.header_color,
    tableHeaderColor: row.table_header_color,
    rowColorOdd: row.row_color_odd,
    rowColorEven: row.row_color_even,
    fontScale: row.font_scale,
    rowHeightMm: row.row_height_mm,
    columnWidths: JSON.parse(row.column_widths),
    margins: JSON.parse(row.margins),
    additionalSettings: JSON.parse(row.additional_settings),
  };
}

/**
 * Updates default company settings.
 */
export function updateCompanySettings(
  input: HeaderSnapshot,
  db: Database.Database = getDb()
): void {
  const validated = headerSnapshotSchema.parse(input);
  const stmt = db.prepare(`
    UPDATE company_settings SET
      company_name = ?,
      document_title = ?,
      fax_number = ?,
      manager_name = ?,
      transmission_instructions = ?,
      vertical_instructions = ?,
      approval_title = ?,
      approval_position = ?,
      column_labels = ?,
      additional_notes = ?
    WHERE id = 1
  `);

  stmt.run(
    validated.companyName,
    validated.title,
    validated.faxNumber,
    validated.managerName,
    validated.transmissionInstructions,
    validated.verticalInstructions,
    validated.approvalTitle,
    validated.approvalPosition,
    JSON.stringify(validated.columnLabels),
    validated.additionalNotes || null
  );
}

/**
 * Updates default design settings.
 */
export function updateDesignSettings(
  input: DesignSnapshot,
  db: Database.Database = getDb()
): void {
  const validated = designSnapshotSchema.parse(input);
  const normalizedWidths = normalizeColumnWidths(validated.columnWidths);

  const stmt = db.prepare(`
    UPDATE design_settings SET
      header_color = ?,
      table_header_color = ?,
      row_color_odd = ?,
      row_color_even = ?,
      font_scale = ?,
      row_height_mm = ?,
      column_widths = ?,
      margins = ?,
      additional_settings = ?
    WHERE id = 1
  `);

  stmt.run(
    validated.headerColor,
    validated.tableHeaderColor,
    validated.rowColorOdd,
    validated.rowColorEven,
    validated.fontScale,
    validated.rowHeightMm,
    JSON.stringify(normalizedWidths),
    JSON.stringify(validated.margins),
    JSON.stringify(validated.additionalSettings)
  );
}

/**
 * Restores company and design settings to standard defaults.
 */
export function restoreDefaultSettings(db: Database.Database = getDb()): void {
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE company_settings SET
        company_name = ?,
        document_title = ?,
        fax_number = ?,
        manager_name = ?,
        transmission_instructions = ?,
        vertical_instructions = ?,
        approval_title = ?,
        approval_position = ?,
        column_labels = ?,
        additional_notes = ?
      WHERE id = 1
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

    db.prepare(`
      UPDATE design_settings SET
        header_color = ?,
        table_header_color = ?,
        row_color_odd = ?,
        row_color_even = ?,
        font_scale = ?,
        row_height_mm = ?,
        column_widths = ?,
        margins = ?,
        additional_settings = ?
      WHERE id = 1
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
  });
  tx();
}

/**
 * Fetches shift by YYYY-MM-DD along with its employees.
 */
export function getShiftByDate(
  shiftDate: string,
  db: Database.Database = getDb()
): ShiftWithEmployees | null {
  const shiftRow = db
    .prepare('SELECT * FROM daily_shifts WHERE shift_date = ?')
    .get(shiftDate) as {
    id: number;
    shift_date: string;
    header_snapshot: string;
    design_snapshot: string;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!shiftRow) return null;

  const employees = db
    .prepare(
      'SELECT * FROM shift_employees WHERE shift_id = ? ORDER BY display_order ASC, id ASC'
    )
    .all(shiftRow.id) as ShiftEmployee[];

  return {
    id: shiftRow.id,
    shift_date: shiftRow.shift_date,
    header_snapshot: JSON.parse(shiftRow.header_snapshot),
    design_snapshot: JSON.parse(shiftRow.design_snapshot),
    created_at: shiftRow.created_at,
    updated_at: shiftRow.updated_at,
    employees,
  };
}

/**
 * Fetches shift by ID along with its employees.
 */
export function getShiftById(
  shiftId: number,
  db: Database.Database = getDb()
): ShiftWithEmployees | null {
  const shiftRow = db
    .prepare('SELECT * FROM daily_shifts WHERE id = ?')
    .get(shiftId) as {
    id: number;
    shift_date: string;
    header_snapshot: string;
    design_snapshot: string;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!shiftRow) return null;

  const employees = db
    .prepare(
      'SELECT * FROM shift_employees WHERE shift_id = ? ORDER BY display_order ASC, id ASC'
    )
    .all(shiftRow.id) as ShiftEmployee[];

  return {
    id: shiftRow.id,
    shift_date: shiftRow.shift_date,
    header_snapshot: JSON.parse(shiftRow.header_snapshot),
    design_snapshot: JSON.parse(shiftRow.design_snapshot),
    created_at: shiftRow.created_at,
    updated_at: shiftRow.updated_at,
    employees,
  };
}

/**
 * Queries dates that currently have a shift within a range [startDate, endDate].
 */
export function listShiftDatesInRange(
  startDate: string,
  endDate: string,
  db: Database.Database = getDb()
): string[] {
  const rows = db
    .prepare(
      'SELECT shift_date FROM daily_shifts WHERE shift_date >= ? AND shift_date <= ? ORDER BY shift_date ASC'
    )
    .all(startDate, endDate) as Array<{ shift_date: string }>;

  return rows.map((r) => r.shift_date);
}

/**
 * Lists all shifts for History view, grouped or sorted newest first.
 */
export function listAllShifts(db: Database.Database = getDb()): Array<{
  id: number;
  shift_date: string;
  staff_count: number;
  nicknames: string[];
}> {
  const shifts = db
    .prepare('SELECT id, shift_date FROM daily_shifts ORDER BY shift_date DESC')
    .all() as Array<{ id: number; shift_date: string }>;

  const employeeStmt = db.prepare(
    'SELECT nickname, employee_name FROM shift_employees WHERE shift_id = ? ORDER BY display_order ASC LIMIT 5'
  );

  const countStmt = db.prepare(
    'SELECT COUNT(*) as count FROM shift_employees WHERE shift_id = ?'
  );

  return shifts.map((shift) => {
    const countRow = countStmt.get(shift.id) as { count: number };
    const empRows = employeeStmt.all(shift.id) as Array<{
      nickname: string | null;
      employee_name: string;
    }>;
    const nicknames = empRows
      .map((e) => (e.nickname && e.nickname.trim() ? e.nickname.trim() : e.employee_name))
      .filter(Boolean);

    return {
      id: shift.id,
      shift_date: shift.shift_date,
      staff_count: countRow.count,
      nicknames,
    };
  });
}

/**
 * Creates a new shift with snapshots and employee list in a single transaction.
 */
export function createShift(
  data: {
    shift_date: string;
    header_snapshot?: HeaderSnapshot;
    design_snapshot?: DesignSnapshot;
    employees?: EmployeeInput[];
  },
  db: Database.Database = getDb()
): ShiftWithEmployees {
  const header = data.header_snapshot ? headerSnapshotSchema.parse(data.header_snapshot) : getCompanySettings(db);
  const design = data.design_snapshot ? designSnapshotSchema.parse(data.design_snapshot) : getDesignSettings(db);
  design.columnWidths = normalizeColumnWidths(design.columnWidths);

  const employees = (data.employees || []).map((e) => employeeInputSchema.parse(e));
  const now = new Date().toISOString();

  let shiftId = 0;

  const tx = db.transaction(() => {
    const result = db
      .prepare(`
        INSERT INTO daily_shifts (shift_date, header_snapshot, design_snapshot, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        data.shift_date,
        JSON.stringify(header),
        JSON.stringify(design),
        now,
        now
      );

    shiftId = Number(result.lastInsertRowid);

    const insertEmp = db.prepare(`
      INSERT INTO shift_employees (
        shift_id, display_order, employee_code, employee_name, nickname,
        remarks, planned_start_time, actual_start_time, planned_end_time,
        break_time, locker_number, signature, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    employees.forEach((emp, index) => {
      insertEmp.run(
        shiftId,
        index + 1,
        emp.employee_code || null,
        emp.employee_name,
        emp.nickname || null,
        emp.remarks || null,
        emp.planned_start_time || null,
        emp.actual_start_time || null,
        emp.planned_end_time || null,
        emp.break_time || null,
        emp.locker_number || null,
        emp.signature || null,
        now,
        now
      );
    });
  });

  tx();

  const created = getShiftById(shiftId, db);
  if (!created) throw new Error('Failed to retrieve newly created shift');
  return created;
}

/**
 * Updates this shift's header snapshot only.
 */
export function updateShiftHeaderSnapshot(
  shiftId: number,
  headerSnapshot: HeaderSnapshot,
  db: Database.Database = getDb()
): void {
  const validated = headerSnapshotSchema.parse(headerSnapshot);
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE daily_shifts SET header_snapshot = ?, updated_at = ? WHERE id = ?
  `).run(JSON.stringify(validated), now, shiftId);
}

/**
 * Updates this shift's design snapshot only.
 */
export function updateShiftDesignSnapshot(
  shiftId: number,
  designSnapshot: DesignSnapshot,
  db: Database.Database = getDb()
): void {
  const validated = designSnapshotSchema.parse(designSnapshot);
  validated.columnWidths = normalizeColumnWidths(validated.columnWidths);
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE daily_shifts SET design_snapshot = ?, updated_at = ? WHERE id = ?
  `).run(JSON.stringify(validated), now, shiftId);
}

/**
 * Applies current global company & design settings to an existing shift (when user explicitly requests '反映する').
 */
export function applyCurrentSettingsToShift(
  shiftId: number,
  db: Database.Database = getDb()
): void {
  const currentHeader = getCompanySettings(db);
  const currentDesign = getDesignSettings(db);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE daily_shifts SET
      header_snapshot = ?,
      design_snapshot = ?,
      updated_at = ?
    WHERE id = ?
  `).run(JSON.stringify(currentHeader), JSON.stringify(currentDesign), now, shiftId);
}

/**
 * Deletes a shift by ID (cascades to employees).
 */
export function deleteShift(shiftId: number, db: Database.Database = getDb()): void {
  db.prepare('DELETE FROM daily_shifts WHERE id = ?').run(shiftId);
}

/**
 * Deletes a shift by date (cascades to employees).
 */
export function deleteShiftByDate(shiftDate: string, db: Database.Database = getDb()): void {
  db.prepare('DELETE FROM daily_shifts WHERE shift_date = ?').run(shiftDate);
}

/**
 * Adds an employee to an existing shift at the bottom.
 */
export function addEmployee(
  shiftId: number,
  employee: EmployeeInput,
  db: Database.Database = getDb()
): ShiftEmployee {
  const validated = employeeInputSchema.parse(employee);
  const now = new Date().toISOString();

  let employeeId = 0;
  const tx = db.transaction(() => {
    const maxOrderRow = db
      .prepare('SELECT MAX(display_order) as max_order FROM shift_employees WHERE shift_id = ?')
      .get(shiftId) as { max_order: number | null };
    const nextOrder = (maxOrderRow.max_order || 0) + 1;

    const res = db
      .prepare(`
        INSERT INTO shift_employees (
          shift_id, display_order, employee_code, employee_name, nickname,
          remarks, planned_start_time, actual_start_time, planned_end_time,
          break_time, locker_number, signature, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `)
      .run(
        shiftId,
        nextOrder,
        validated.employee_code || null,
        validated.employee_name,
        validated.nickname || null,
        validated.remarks || null,
        validated.planned_start_time || null,
        validated.actual_start_time || null,
        validated.planned_end_time || null,
        validated.break_time || null,
        validated.locker_number || null,
        validated.signature || null,
        now,
        now
      );

    employeeId = Number(res.lastInsertRowid);

    // Update shift's updated_at
    db.prepare('UPDATE daily_shifts SET updated_at = ? WHERE id = ?').run(now, shiftId);
  });

  tx();

  return db.prepare('SELECT * FROM shift_employees WHERE id = ?').get(employeeId) as ShiftEmployee;
}

/**
 * Updates an employee's data.
 */
export function updateEmployee(
  employeeId: number,
  employee: Partial<EmployeeInput>,
  db: Database.Database = getDb()
): ShiftEmployee {
  const current = db.prepare('SELECT * FROM shift_employees WHERE id = ?').get(employeeId) as ShiftEmployee | undefined;
  if (!current) throw new Error(`Employee with ID ${employeeId} not found`);

  const merged = {
    employee_name: employee.employee_name ?? current.employee_name,
    employee_code: employee.employee_code !== undefined ? employee.employee_code : current.employee_code,
    nickname: employee.nickname !== undefined ? employee.nickname : current.nickname,
    remarks: employee.remarks !== undefined ? employee.remarks : current.remarks,
    planned_start_time: employee.planned_start_time !== undefined ? employee.planned_start_time : current.planned_start_time,
    actual_start_time: employee.actual_start_time !== undefined ? employee.actual_start_time : current.actual_start_time,
    planned_end_time: employee.planned_end_time !== undefined ? employee.planned_end_time : current.planned_end_time,
    break_time: employee.break_time !== undefined ? employee.break_time : current.break_time,
    locker_number: employee.locker_number !== undefined ? employee.locker_number : current.locker_number,
    signature: employee.signature !== undefined ? employee.signature : current.signature,
  };

  const validated = employeeInputSchema.parse(merged);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE shift_employees SET
      employee_code = ?,
      employee_name = ?,
      nickname = ?,
      remarks = ?,
      planned_start_time = ?,
      actual_start_time = ?,
      planned_end_time = ?,
      break_time = ?,
      locker_number = ?,
      signature = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    validated.employee_code || null,
    validated.employee_name,
    validated.nickname || null,
    validated.remarks || null,
    validated.planned_start_time || null,
    validated.actual_start_time || null,
    validated.planned_end_time || null,
    validated.break_time || null,
    validated.locker_number || null,
    validated.signature || null,
    now,
    employeeId
  );

  db.prepare('UPDATE daily_shifts SET updated_at = ? WHERE id = ?').run(now, current.shift_id);

  return db.prepare('SELECT * FROM shift_employees WHERE id = ?').get(employeeId) as ShiftEmployee;
}

/**
 * Deletes an employee and re-indexes remaining display_order values (1, 2, 3 ...).
 */
export function deleteEmployee(employeeId: number, db: Database.Database = getDb()): void {
  const current = db.prepare('SELECT * FROM shift_employees WHERE id = ?').get(employeeId) as ShiftEmployee | undefined;
  if (!current) return;

  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM shift_employees WHERE id = ?').run(employeeId);

    // Reorder remaining
    const remaining = db
      .prepare('SELECT id FROM shift_employees WHERE shift_id = ? ORDER BY display_order ASC, id ASC')
      .all(current.shift_id) as Array<{ id: number }>;

    const updateOrderStmt = db.prepare('UPDATE shift_employees SET display_order = ? WHERE id = ?');
    remaining.forEach((emp, idx) => {
      updateOrderStmt.run(idx + 1, emp.id);
    });

    db.prepare('UPDATE daily_shifts SET updated_at = ? WHERE id = ?').run(now, current.shift_id);
  });

  tx();
}

/**
 * Swaps or reorders employees according to given array of IDs.
 */
export function reorderEmployees(
  shiftId: number,
  employeeIdsInOrder: number[],
  db: Database.Database = getDb()
): void {
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    const updateStmt = db.prepare(
      'UPDATE shift_employees SET display_order = ?, updated_at = ? WHERE id = ? AND shift_id = ?'
    );
    employeeIdsInOrder.forEach((id, index) => {
      updateStmt.run(index + 1, now, id, shiftId);
    });
    db.prepare('UPDATE daily_shifts SET updated_at = ? WHERE id = ?').run(now, shiftId);
  });
  tx();
}

/**
 * Copies the closest earlier shift into targetDate.
 * - Copies employees with planned times.
 * - Clears actual_start_time and signature.
 * - Header and design snapshots are taken from the current settings.
 */
export function copyPreviousShift(
  targetDate: string,
  db: Database.Database = getDb()
): ShiftWithEmployees {
  // Find closest earlier shift
  const prevShiftRow = db
    .prepare('SELECT id, shift_date FROM daily_shifts WHERE shift_date < ? ORDER BY shift_date DESC LIMIT 1')
    .get(targetDate) as { id: number; shift_date: string } | undefined;

  if (!prevShiftRow) {
    throw new Error('コピー元となる過去のシフトが見つかりません');
  }

  const prevEmployees = db
    .prepare('SELECT * FROM shift_employees WHERE shift_id = ? ORDER BY display_order ASC, id ASC')
    .all(prevShiftRow.id) as ShiftEmployee[];

  const employeesToCopy: EmployeeInput[] = prevEmployees.map((e) => ({
    employee_name: e.employee_name,
    employee_code: e.employee_code,
    nickname: e.nickname,
    remarks: e.remarks,
    planned_start_time: e.planned_start_time,
    actual_start_time: null, // cleared
    planned_end_time: e.planned_end_time,
    break_time: e.break_time,
    locker_number: e.locker_number,
    signature: null, // cleared
  }));

  return createShift(
    {
      shift_date: targetDate,
      employees: employeesToCopy,
    },
    db
  );
}

/**
 * Autofill helper (for P8): finds recently used employee codes, nicknames, times, locker numbers from previous shifts.
 */
export function getPastStaffSuggestions(db: Database.Database = getDb()): Array<{
  employee_name: string;
  employee_code: string | null;
  nickname: string | null;
  planned_start_time: string | null;
  planned_end_time: string | null;
  break_time: string | null;
  locker_number: string | null;
}> {
  return db.prepare(`
    SELECT employee_name, employee_code, nickname, planned_start_time, planned_end_time, break_time, locker_number
    FROM shift_employees
    GROUP BY employee_name
    ORDER BY MAX(created_at) DESC
    LIMIT 100
  `).all() as Array<{
    employee_name: string;
    employee_code: string | null;
    nickname: string | null;
    planned_start_time: string | null;
    planned_end_time: string | null;
    break_time: string | null;
    locker_number: string | null;
  }>;
}

/**
 * Real-time staff search: scans all employee names across the database matching the query string.
 */
export function searchStaffSuggestions(
  query: string,
  db: Database.Database = getDb()
): Array<{
  employee_name: string;
  employee_code: string | null;
  nickname: string | null;
  planned_start_time: string | null;
  planned_end_time: string | null;
  break_time: string | null;
  locker_number: string | null;
}> {
  const trimmed = query.trim();
  if (!trimmed) {
    return getPastStaffSuggestions(db);
  }

  const pattern = `%${trimmed}%`;
  return db.prepare(`
    SELECT employee_name, employee_code, nickname, planned_start_time, planned_end_time, break_time, locker_number
    FROM shift_employees
    WHERE employee_name LIKE ? OR nickname LIKE ? OR employee_code LIKE ?
    GROUP BY employee_name
    ORDER BY MAX(created_at) DESC
    LIMIT 20
  `).all(pattern, pattern, pattern) as Array<{
    employee_name: string;
    employee_code: string | null;
    nickname: string | null;
    planned_start_time: string | null;
    planned_end_time: string | null;
    break_time: string | null;
    locker_number: string | null;
  }>;
}

