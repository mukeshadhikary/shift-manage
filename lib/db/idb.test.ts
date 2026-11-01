import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  openShiftDB,
  getCompanySettings,
  updateCompanySettings,
  getDesignSettings,
  updateDesignSettings,
  restoreDefaultSettings,
  saveShiftWizard,
  getShiftByDate,
  getShiftById,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  reorderEmployees,
  copyPreviousShift,
  deleteShift,
  listShiftDatesInRange,
  listAllShifts,
  searchStaffSuggestions,
  exportFullBackupJSON,
  importFullBackupJSON,
} from './idb';
import { DEFAULT_HEADER_SNAPSHOT, DEFAULT_DESIGN_SNAPSHOT } from '../defaults';

describe('IndexedDB Persistence Layer (lib/db/idb.ts)', () => {
  beforeEach(async () => {
    // Clear IndexedDB between tests
    const db = await openShiftDB();
    const tx = db.transaction(['shifts', 'settings', 'staff_catalog'], 'readwrite');
    tx.objectStore('shifts').clear();
    tx.objectStore('settings').clear();
    tx.objectStore('staff_catalog').clear();
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
  });

  it('initializes and seeds default company and design settings', async () => {
    const company = await getCompanySettings();
    expect(company.companyName).toBe(DEFAULT_HEADER_SNAPSHOT.companyName);
    expect(company.title).toBe(DEFAULT_HEADER_SNAPSHOT.title);

    const design = await getDesignSettings();
    expect(design.headerColor).toBe(DEFAULT_DESIGN_SNAPSHOT.headerColor);
    expect(design.rowHeightMm).toBe(DEFAULT_DESIGN_SNAPSHOT.rowHeightMm);
  });

  it('updates company and design settings', async () => {
    const updatedCompany = {
      ...DEFAULT_HEADER_SNAPSHOT,
      companyName: 'テスト運輸株式会社',
    };
    await updateCompanySettings(updatedCompany);

    const retrievedCompany = await getCompanySettings();
    expect(retrievedCompany.companyName).toBe('テスト運輸株式会社');

    const updatedDesign = {
      ...DEFAULT_DESIGN_SNAPSHOT,
      rowHeightMm: 15,
    };
    await updateDesignSettings(updatedDesign);

    const retrievedDesign = await getDesignSettings();
    expect(retrievedDesign.rowHeightMm).toBe(15);
  });

  it('restores default settings', async () => {
    await updateCompanySettings({
      ...DEFAULT_HEADER_SNAPSHOT,
      companyName: '一時変更会社',
    });
    const restored = await restoreDefaultSettings();
    expect(restored.company.companyName).toBe(DEFAULT_HEADER_SNAPSHOT.companyName);

    const current = await getCompanySettings();
    expect(current.companyName).toBe(DEFAULT_HEADER_SNAPSHOT.companyName);
  });

  it('creates and retrieves a shift via saveShiftWizard', async () => {
    const date = '2026-11-01';
    const created = await saveShiftWizard({
      shift_date: date,
      employees: [
        {
          employee_name: '田中 太郎',
          employee_code: 'MS0001',
          nickname: 'タナカ',
          planned_start_time: '09:00',
          planned_end_time: '18:00',
          break_time: '1:00',
          locker_number: '12',
        },
        {
          employee_name: '佐藤 次郎',
          employee_code: 'MS0002',
          nickname: 'サトウ',
          planned_start_time: '10:00',
          planned_end_time: '19:00',
          break_time: '1:00',
          locker_number: '14',
        },
      ],
    });

    expect(created.shift_date).toBe(date);
    expect(created.employees).toHaveLength(2);
    expect(created.employees[0].display_order).toBe(1);
    expect(created.employees[1].display_order).toBe(2);

    const retrieved = await getShiftByDate(date);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.shift_date).toBe(date);
    expect(retrieved?.employees).toHaveLength(2);

    const byId = await getShiftById(created.id);
    expect(byId).not.toBeNull();
    expect(byId?.id).toBe(created.id);
  });

  it('adds, updates, reorders, and deletes employees', async () => {
    const date = '2026-11-02';
    const shift = await saveShiftWizard({
      shift_date: date,
      employees: [
        {
          employee_name: 'スタッフ A',
          employee_code: 'A001',
        },
      ],
    });

    // Add employee
    const added = await addEmployee(shift.id, {
      employee_name: 'スタッフ B',
      employee_code: 'B002',
      nickname: 'ビィ',
    });
    expect(added.display_order).toBe(2);

    let updatedShift = await getShiftByDate(date);
    expect(updatedShift?.employees).toHaveLength(2);

    // Update employee
    await updateEmployee(added.id, {
      nickname: 'ビィ更新',
      remarks: 'リーダー担当',
    });

    updatedShift = await getShiftByDate(date);
    const empB = updatedShift?.employees.find((e) => e.id === added.id);
    expect(empB?.nickname).toBe('ビィ更新');
    expect(empB?.remarks).toBe('リーダー担当');

    // Reorder employees
    const empAId = updatedShift!.employees[0].id;
    await reorderEmployees(shift.id, [added.id, empAId]);

    updatedShift = await getShiftByDate(date);
    expect(updatedShift?.employees[0].id).toBe(added.id);
    expect(updatedShift?.employees[0].display_order).toBe(1);
    expect(updatedShift?.employees[1].id).toBe(empAId);
    expect(updatedShift?.employees[1].display_order).toBe(2);

    // Delete employee
    await deleteEmployee(added.id);
    updatedShift = await getShiftByDate(date);
    expect(updatedShift?.employees).toHaveLength(1);
    expect(updatedShift?.employees[0].display_order).toBe(1);
  });

  it('copies previous shift into a new date resetting actual times', async () => {
    await saveShiftWizard({
      shift_date: '2026-11-05',
      employees: [
        {
          employee_name: '山田 花子',
          employee_code: 'Y001',
          actual_start_time: '08:50',
          signature: '山田',
        },
      ],
    });

    const copied = await copyPreviousShift('2026-11-06');
    expect(copied.shift_date).toBe('2026-11-06');
    expect(copied.employees).toHaveLength(1);
    expect(copied.employees[0].employee_name).toBe('山田 花子');
    // Actual times and signature must be reset
    expect(copied.employees[0].actual_start_time).toBeNull();
    expect(copied.employees[0].signature).toBeNull();
  });

  it('lists shift dates in range and summarizes shifts for history', async () => {
    await saveShiftWizard({ shift_date: '2026-11-10', employees: [] });
    await saveShiftWizard({
      shift_date: '2026-11-12',
      employees: [{ employee_name: 'テスト1', nickname: 'テス' }],
    });
    await saveShiftWizard({ shift_date: '2026-11-15', employees: [] });

    const dates = await listShiftDatesInRange('2026-11-09', '2026-11-13');
    expect(dates).toEqual(['2026-11-10', '2026-11-12']);

    const history = await listAllShifts();
    expect(history.length).toBeGreaterThanOrEqual(3);
    const nov12 = history.find((h) => h.shift_date === '2026-11-12');
    expect(nov12?.staff_count).toBe(1);
    expect(nov12?.nicknames).toContain('テス');
  });

  it('scans and suggests staff members in real time', async () => {
    await saveShiftWizard({
      shift_date: '2026-11-20',
      employees: [
        {
          employee_name: '鈴木 一郎',
          employee_code: 'SZ001',
          nickname: 'イチロー',
          planned_start_time: '09:00',
          locker_number: '7',
        },
      ],
    });

    const results = await searchStaffSuggestions('鈴木');
    expect(results).toHaveLength(1);
    expect(results[0].employee_name).toBe('鈴木 一郎');
    expect(results[0].employee_code).toBe('SZ001');
    expect(results[0].locker_number).toBe('7');

    const byNickname = await searchStaffSuggestions('イチ');
    expect(byNickname).toHaveLength(1);
    expect(byNickname[0].employee_name).toBe('鈴木 一郎');
  });

  it('exports and imports a full JSON database backup', async () => {
    await saveShiftWizard({
      shift_date: '2026-11-25',
      employees: [
        {
          employee_name: 'バックアップ太郎',
          employee_code: 'BK01',
        },
      ],
    });

    const backupJson = await exportFullBackupJSON();
    expect(backupJson).toContain('バックアップ太郎');
    expect(backupJson).toContain('2026-11-25');

    // Delete shift
    const beforeShift = await getShiftByDate('2026-11-25');
    await deleteShift(beforeShift!.id, '2026-11-25');
    expect(await getShiftByDate('2026-11-25')).toBeNull();

    // Restore from JSON
    await importFullBackupJSON(backupJson);
    const restoredShift = await getShiftByDate('2026-11-25');
    expect(restoredShift).not.toBeNull();
    expect(restoredShift?.employees[0].employee_name).toBe('バックアップ太郎');
  });
});
