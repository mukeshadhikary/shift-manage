import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initDatabase } from './index';
import {
  getCompanySettings,
  getDesignSettings,
  updateCompanySettings,
  updateDesignSettings,
  restoreDefaultSettings,
  createShift,
  getShiftByDate,
  getShiftById,
  deleteShift,
  deleteShiftByDate,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  reorderEmployees,
  copyPreviousShift,
  listShiftDatesInRange,
  listAllShifts,
  applyCurrentSettingsToShift,
  searchStaffSuggestions,
} from './repository';
import { DEFAULT_HEADER_SNAPSHOT, DEFAULT_DESIGN_SNAPSHOT } from '../defaults';

describe('Database Repository Integration Tests', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Fresh in-memory database for each test
    db = initDatabase(':memory:');
  });

  it('initializes with default company and design settings', () => {
    const company = getCompanySettings(db);
    expect(company.title).toBe(DEFAULT_HEADER_SNAPSHOT.title);
    expect(company.companyName).toBe(DEFAULT_HEADER_SNAPSHOT.companyName);
    expect(company.columnLabels).toHaveLength(11);

    const design = getDesignSettings(db);
    expect(design.headerColor).toBe(DEFAULT_DESIGN_SNAPSHOT.headerColor);
    expect(design.columnWidths).toHaveLength(11);
  });

  it('creates and retrieves a shift with employees and snapshots', () => {
    const shift = createShift(
      {
        shift_date: '2026-10-31',
        employees: [
          {
            employee_name: '田中 太郎',
            employee_code: 'MS0001',
            nickname: 'タナカ',
            remarks: 'リーダー',
            planned_start_time: '09:00',
            actual_start_time: '08:55',
            planned_end_time: '18:00',
            break_time: '1:00',
            locker_number: '12',
            signature: null,
          },
        ],
      },
      db
    );

    expect(shift.id).toBeGreaterThan(0);
    expect(shift.shift_date).toBe('2026-10-31');
    expect(shift.employees).toHaveLength(1);
    expect(shift.employees[0].employee_name).toBe('田中 太郎');
    expect(shift.employees[0].display_order).toBe(1);
    expect(shift.header_snapshot.title).toBe(DEFAULT_HEADER_SNAPSHOT.title);

    const retrieved = getShiftByDate('2026-10-31', db);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(shift.id);
    expect(retrieved?.employees[0].employee_name).toBe('田中 太郎');
  });

  it('enforces UNIQUE shift_date constraint', () => {
    createShift({ shift_date: '2026-10-31' }, db);
    expect(() => createShift({ shift_date: '2026-10-31' }, db)).toThrow();
  });

  it('cascades delete when shift is deleted', () => {
    const shift = createShift(
      {
        shift_date: '2026-10-31',
        employees: [
          { employee_name: '山田 花子' },
          { employee_name: '佐藤 一郎' },
        ],
      },
      db
    );

    expect(shift.employees).toHaveLength(2);
    deleteShift(shift.id, db);

    const remainingEmployees = db
      .prepare('SELECT COUNT(*) as count FROM shift_employees WHERE shift_id = ?')
      .get(shift.id) as { count: number };
    expect(remainingEmployees.count).toBe(0);

    // Test deleteShiftByDate as well
    createShift({ shift_date: '2026-11-05' }, db);
    expect(getShiftByDate('2026-11-05', db)).not.toBeNull();
    deleteShiftByDate('2026-11-05', db);
    expect(getShiftByDate('2026-11-05', db)).toBeNull();
  });

  it('preserves snapshot isolation: changing settings does NOT alter existing shifts', () => {
    const shift = createShift({ shift_date: '2026-10-31' }, db);
    expect(shift.header_snapshot.companyName).toBe('ワールドワークスCMC');

    // Change global settings
    updateCompanySettings(
      {
        ...DEFAULT_HEADER_SNAPSHOT,
        companyName: '新会社名テスト',
      },
      db
    );

    // Existing shift should be unchanged
    const oldShift = getShiftByDate('2026-10-31', db);
    expect(oldShift?.header_snapshot.companyName).toBe('ワールドワークスCMC');

    // New shift gets updated settings
    const newShift = createShift({ shift_date: '2026-11-01' }, db);
    expect(newShift.header_snapshot.companyName).toBe('新会社名テスト');

    // Explicitly apply current settings to old shift
    applyCurrentSettingsToShift(oldShift!.id, db);
    const updatedOldShift = getShiftByDate('2026-10-31', db);
    expect(updatedOldShift?.header_snapshot.companyName).toBe('新会社名テスト');
  });

  it('supports night shifts (end time earlier than start time)', () => {
    const shift = createShift(
      {
        shift_date: '2026-10-31',
        employees: [
          {
            employee_name: '夜勤 スタッフ',
            planned_start_time: '22:00',
            planned_end_time: '06:00',
          },
        ],
      },
      db
    );

    expect(shift.employees[0].planned_start_time).toBe('22:00');
    expect(shift.employees[0].planned_end_time).toBe('06:00');
  });

  it('handles employee add, update, reorder and delete', () => {
    const shift = createShift({ shift_date: '2026-10-31' }, db);

    const emp1 = addEmployee(shift.id, { employee_name: 'スタッフA' }, db);
    const emp2 = addEmployee(shift.id, { employee_name: 'スタッフB' }, db);
    const emp3 = addEmployee(shift.id, { employee_name: 'スタッフC' }, db);

    expect(emp1.display_order).toBe(1);
    expect(emp2.display_order).toBe(2);
    expect(emp3.display_order).toBe(3);

    // Update emp2
    updateEmployee(emp2.id, { nickname: 'Bさん', remarks: '更新' }, db);
    const updatedShift = getShiftById(shift.id, db);
    const foundEmp2 = updatedShift?.employees.find((e) => e.id === emp2.id);
    expect(foundEmp2?.nickname).toBe('Bさん');
    expect(foundEmp2?.remarks).toBe('更新');

    // Reorder: 3, 1, 2
    reorderEmployees(shift.id, [emp3.id, emp1.id, emp2.id], db);
    const reorderedShift = getShiftById(shift.id, db);
    expect(reorderedShift?.employees[0].id).toBe(emp3.id);
    expect(reorderedShift?.employees[0].display_order).toBe(1);
    expect(reorderedShift?.employees[1].id).toBe(emp1.id);
    expect(reorderedShift?.employees[1].display_order).toBe(2);
    expect(reorderedShift?.employees[2].id).toBe(emp2.id);
    expect(reorderedShift?.employees[2].display_order).toBe(3);

    // Delete middle (emp1)
    deleteEmployee(emp1.id, db);
    const afterDeleteShift = getShiftById(shift.id, db);
    expect(afterDeleteShift?.employees).toHaveLength(2);
    expect(afterDeleteShift?.employees[0].id).toBe(emp3.id);
    expect(afterDeleteShift?.employees[0].display_order).toBe(1);
    expect(afterDeleteShift?.employees[1].id).toBe(emp2.id);
    expect(afterDeleteShift?.employees[1].display_order).toBe(2);
  });

  it('copies previous shift correctly (clearing actual times and signature)', () => {
    createShift(
      {
        shift_date: '2026-10-25',
        employees: [
          {
            employee_name: '先輩 スタッフ',
            planned_start_time: '09:00',
            actual_start_time: '08:50',
            planned_end_time: '18:00',
            break_time: '1:00',
            signature: '自署サイン済み',
          },
        ],
      },
      db
    );

    const copiedShift = copyPreviousShift('2026-10-31', db);
    expect(copiedShift.shift_date).toBe('2026-10-31');
    expect(copiedShift.employees).toHaveLength(1);
    expect(copiedShift.employees[0].employee_name).toBe('先輩 スタッフ');
    expect(copiedShift.employees[0].planned_start_time).toBe('09:00');
    expect(copiedShift.employees[0].planned_end_time).toBe('18:00');
    // Cleared fields
    expect(copiedShift.employees[0].actual_start_time).toBeNull();
    expect(copiedShift.employees[0].signature).toBeNull();
  });

  it('lists shift dates in range and lists history', () => {
    createShift({ shift_date: '2026-10-10' }, db);
    createShift({ shift_date: '2026-10-20' }, db);
    createShift({ shift_date: '2026-10-31' }, db);

    const dates = listShiftDatesInRange('2026-10-01', '2026-10-25', db);
    expect(dates).toEqual(['2026-10-10', '2026-10-20']);

    const history = listAllShifts(db);
    expect(history).toHaveLength(3);
    expect(history[0].shift_date).toBe('2026-10-31');
  });

  it('restores default settings', () => {
    updateCompanySettings(
      {
        ...DEFAULT_HEADER_SNAPSHOT,
        companyName: 'カスタム会社名',
      },
      db
    );
    updateDesignSettings(
      {
        ...DEFAULT_DESIGN_SNAPSHOT,
        fontScale: 110,
      },
      db
    );
    expect(getCompanySettings(db).companyName).toBe('カスタム会社名');
    expect(getDesignSettings(db).fontScale).toBe(110);

    restoreDefaultSettings(db);
    expect(getCompanySettings(db).companyName).toBe('ワールドワークスCMC');
    expect(getDesignSettings(db).fontScale).toBe(100);
  });

  it('searches staff suggestions in real time across the database', () => {
    createShift(
      {
        shift_date: '2026-10-20',
        employees: [
          {
            employee_name: '田中 太郎',
            employee_code: 'MS100',
            nickname: 'タナカ',
            planned_start_time: '09:00',
            planned_end_time: '18:00',
            locker_number: '10',
          },
          {
            employee_name: '佐藤 花子',
            employee_code: 'MS200',
            nickname: 'ハナ',
            planned_start_time: '10:00',
            planned_end_time: '19:00',
            locker_number: '12',
          },
        ],
      },
      db
    );

    // Search by partial name
    const res1 = searchStaffSuggestions('田中', db);
    expect(res1).toHaveLength(1);
    expect(res1[0].employee_name).toBe('田中 太郎');
    expect(res1[0].employee_code).toBe('MS100');
    expect(res1[0].locker_number).toBe('10');

    // Search by partial code
    const res2 = searchStaffSuggestions('MS20', db);
    expect(res2).toHaveLength(1);
    expect(res2[0].employee_name).toBe('佐藤 花子');

    // Search by partial nickname
    const res3 = searchStaffSuggestions('ハナ', db);
    expect(res3).toHaveLength(1);
    expect(res3[0].employee_name).toBe('佐藤 花子');

    // Empty query returns all suggestions
    const all = searchStaffSuggestions('', db);
    expect(all).toHaveLength(2);
  });
});
