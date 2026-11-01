import {
  HeaderSnapshot,
  DesignSnapshot,
  ShiftEmployee,
  ShiftWithEmployees,
} from '../types';
import {
  DEFAULT_HEADER_SNAPSHOT,
  DEFAULT_DESIGN_SNAPSHOT,
} from '../defaults';
import { EmployeeInput } from './schema';

const DB_NAME = 'ShiftSheetDB';
const DB_VERSION = 1;

export interface StaffSuggestion {
  employee_name: string;
  employee_code: string | null;
  nickname: string | null;
  remarks: string | null;
  planned_start_time: string | null;
  actual_start_time: string | null;
  planned_end_time: string | null;
  break_time: string | null;
  locker_number: string | null;
}



function getIndexedDB(): IDBFactory | null {
  if (typeof window !== 'undefined' && window.indexedDB) {
    return window.indexedDB;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { indexedDB?: IDBFactory }).indexedDB) {
    return (globalThis as unknown as { indexedDB?: IDBFactory }).indexedDB!;
  }
  return null;
}

let idCounter = 0;
export function generateUniqueId(): number {
  return Date.now() * 1000 + (++idCounter % 1000);
}

/**
 * Opens and initializes the IndexedDB database.
 */
export function openShiftDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const idb = getIndexedDB();
    if (!idb) {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Shifts store (keyed by shift_date YYYY-MM-DD)
      if (!db.objectStoreNames.contains('shifts')) {
        const shiftStore = db.createObjectStore('shifts', { keyPath: 'shift_date' });
        shiftStore.createIndex('id', 'id', { unique: false });
        shiftStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Settings store (keyed by 'key')
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // Staff catalog store (keyed by employee_name)
      if (!db.objectStoreNames.contains('staff_catalog')) {
        db.createObjectStore('staff_catalog', { keyPath: 'employee_name' });
      }
    };

    request.onsuccess = async (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      try {
        await seedDefaultSettingsIfNeeded(db);
        resolve(db);
      } catch {
        resolve(db);
      }
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Seeds default settings if the settings store is empty.
 */
function seedDefaultSettingsIfNeeded(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');

      const companyReq = store.get('company');
      companyReq.onsuccess = () => {
        if (!companyReq.result) {
          store.put({ key: 'company', value: DEFAULT_HEADER_SNAPSHOT });
        }
      };

      const designReq = store.get('design');
      designReq.onsuccess = () => {
        if (!designReq.result) {
          store.put({ key: 'design', value: DEFAULT_DESIGN_SNAPSHOT });
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Retrieves company settings.
 */
export async function getCompanySettings(): Promise<HeaderSnapshot> {
  if (!getIndexedDB()) return { ...DEFAULT_HEADER_SNAPSHOT };
  try {
    const db = await openShiftDB();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const req = tx.objectStore('settings').get('company');
      req.onsuccess = () => {
        if (req.result && req.result.value) {
          resolve(req.result.value as HeaderSnapshot);
        } else {
          resolve({ ...DEFAULT_HEADER_SNAPSHOT });
        }
      };
      req.onerror = () => resolve({ ...DEFAULT_HEADER_SNAPSHOT });
    });
  } catch {
    return { ...DEFAULT_HEADER_SNAPSHOT };
  }
}

/**
 * Updates company settings.
 */
export async function updateCompanySettings(settings: HeaderSnapshot): Promise<void> {
  const db = await openShiftDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({ key: 'company', value: settings });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieves design settings.
 */
export async function getDesignSettings(): Promise<DesignSnapshot> {
  if (!getIndexedDB()) return { ...DEFAULT_DESIGN_SNAPSHOT };
  try {
    const db = await openShiftDB();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const req = tx.objectStore('settings').get('design');
      req.onsuccess = () => {
        if (req.result && req.result.value) {
          resolve(req.result.value as DesignSnapshot);
        } else {
          resolve({ ...DEFAULT_DESIGN_SNAPSHOT });
        }
      };
      req.onerror = () => resolve({ ...DEFAULT_DESIGN_SNAPSHOT });
    });
  } catch {
    return { ...DEFAULT_DESIGN_SNAPSHOT };
  }
}

/**
 * Updates design settings.
 */
export async function updateDesignSettings(settings: DesignSnapshot): Promise<void> {
  const db = await openShiftDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({ key: 'design', value: settings });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Restores default settings.
 */
export async function restoreDefaultSettings(): Promise<{
  company: HeaderSnapshot;
  design: DesignSnapshot;
}> {
  const db = await openShiftDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    store.put({ key: 'company', value: DEFAULT_HEADER_SNAPSHOT });
    store.put({ key: 'design', value: DEFAULT_DESIGN_SNAPSHOT });
    tx.oncomplete = () => {
      resolve({
        company: { ...DEFAULT_HEADER_SNAPSHOT },
        design: { ...DEFAULT_DESIGN_SNAPSHOT },
      });
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieves a shift by date (YYYY-MM-DD).
 */
export async function getShiftByDate(date: string): Promise<ShiftWithEmployees | null> {
  if (!getIndexedDB()) return null;
  try {
    const db = await openShiftDB();
    return new Promise((resolve) => {
      const tx = db.transaction('shifts', 'readonly');
      const req = tx.objectStore('shifts').get(date);
      req.onsuccess = () => {
        resolve((req.result as ShiftWithEmployees) || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Retrieves a shift by numeric ID.
 */
export async function getShiftById(id: number): Promise<ShiftWithEmployees | null> {
  const db = await openShiftDB();
  return new Promise((resolve) => {
    const tx = db.transaction('shifts', 'readonly');
    const store = tx.objectStore('shifts');
    const index = store.index('id');
    const req = index.get(id);
    req.onsuccess = () => {
      resolve((req.result as ShiftWithEmployees) || null);
    };
    req.onerror = () => resolve(null);
  });
}

/**
 * Updates staff catalog with employee info.
 */
async function updateStaffCatalog(employees: (EmployeeInput | ShiftEmployee)[]): Promise<void> {
  if (!getIndexedDB()) return;
  try {
    const db = await openShiftDB();
    const tx = db.transaction('staff_catalog', 'readwrite');
    const store = tx.objectStore('staff_catalog');

    for (const emp of employees) {
      if (!emp.employee_name || !emp.employee_name.trim()) continue;
      const record: StaffSuggestion = {
        employee_name: emp.employee_name.trim(),
        employee_code: emp.employee_code?.trim() || null,
        nickname: emp.nickname?.trim() || null,
        remarks: emp.remarks?.trim() || null,
        planned_start_time: emp.planned_start_time || null,
        actual_start_time: emp.actual_start_time || null,
        planned_end_time: emp.planned_end_time || null,
        break_time: emp.break_time || null,
        locker_number: emp.locker_number?.trim() || null,
      };
      store.put(record);
    }
  } catch {
    // Non-critical background catalog update
  }
}

/**
 * Saves or updates a shift via the creation wizard.
 */
export async function saveShiftWizard(data: {
  shift_date: string;
  header_snapshot?: HeaderSnapshot;
  design_snapshot?: DesignSnapshot;
  employees: EmployeeInput[];
}): Promise<ShiftWithEmployees> {
  const db = await openShiftDB();
  const existing = await getShiftByDate(data.shift_date);
  const now = new Date().toISOString();

  let shift: ShiftWithEmployees;

  if (existing) {
    const existingEmployees = [...existing.employees];
    let nextDisplayOrder = existingEmployees.length + 1;

    const newEmployees: ShiftEmployee[] = data.employees.map((input) => ({
      id: generateUniqueId(),
      shift_id: existing.id,
      display_order: nextDisplayOrder++,
      employee_code: input.employee_code || null,
      employee_name: input.employee_name,
      nickname: input.nickname || null,
      remarks: input.remarks || null,
      planned_start_time: input.planned_start_time || null,
      actual_start_time: input.actual_start_time || null,
      planned_end_time: input.planned_end_time || null,
      break_time: input.break_time || null,
      locker_number: input.locker_number || null,
      signature: input.signature || null,
      created_at: now,
      updated_at: now,
    }));

    shift = {
      ...existing,
      header_snapshot: data.header_snapshot || existing.header_snapshot,
      design_snapshot: data.design_snapshot || existing.design_snapshot,
      employees: [...existingEmployees, ...newEmployees],
      updated_at: now,
    };
  } else {
    const companySettings = await getCompanySettings();
    const designSettings = await getDesignSettings();
    const shiftId = generateUniqueId();

    const employees: ShiftEmployee[] = data.employees.map((input, idx) => ({
      id: generateUniqueId(),
      shift_id: shiftId,
      display_order: idx + 1,
      employee_code: input.employee_code || null,
      employee_name: input.employee_name,
      nickname: input.nickname || null,
      remarks: input.remarks || null,
      planned_start_time: input.planned_start_time || null,
      actual_start_time: input.actual_start_time || null,
      planned_end_time: input.planned_end_time || null,
      break_time: input.break_time || null,
      locker_number: input.locker_number || null,
      signature: input.signature || null,
      created_at: now,
      updated_at: now,
    }));

    shift = {
      id: shiftId,
      shift_date: data.shift_date,
      header_snapshot: data.header_snapshot || companySettings,
      design_snapshot: data.design_snapshot || designSettings,
      employees,
      created_at: now,
      updated_at: now,
    };
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('shifts', 'readwrite');
    tx.objectStore('shifts').put(shift);
    tx.oncomplete = () => {
      updateStaffCatalog(data.employees);
      resolve(shift);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Copies the closest earlier shift into targetDate.
 */
export async function copyPreviousShift(targetDate: string): Promise<ShiftWithEmployees> {
  const db = await openShiftDB();

  // Find all shifts earlier than targetDate
  const allShifts = await listAllShiftRecords();
  const earlier = allShifts
    .filter((s) => s.shift_date < targetDate)
    .sort((a, b) => b.shift_date.localeCompare(a.shift_date));

  if (earlier.length === 0) {
    throw new Error('コピー元のシフト表が見つかりません');
  }

  const source = earlier[0];
  const now = new Date().toISOString();
  const newShiftId = generateUniqueId();

  const newEmployees: ShiftEmployee[] = source.employees.map((emp, idx) => ({
    ...emp,
    id: generateUniqueId(),
    shift_id: newShiftId,
    display_order: idx + 1,
    actual_start_time: null, // Reset actual times and signature on copy
    signature: null,
    created_at: now,
    updated_at: now,
  }));

  const newShift: ShiftWithEmployees = {
    id: newShiftId,
    shift_date: targetDate,
    header_snapshot: JSON.parse(JSON.stringify(source.header_snapshot)),
    design_snapshot: JSON.parse(JSON.stringify(source.design_snapshot)),
    employees: newEmployees,
    created_at: now,
    updated_at: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('shifts', 'readwrite');
    tx.objectStore('shifts').put(newShift);
    tx.oncomplete = () => resolve(newShift);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Deletes a shift by ID or date.
 */
export async function deleteShift(shiftId: number, shiftDate?: string): Promise<void> {
  const db = await openShiftDB();

  let targetDate = shiftDate;
  if (!targetDate) {
    const shift = await getShiftById(shiftId);
    if (shift) targetDate = shift.shift_date;
  }

  if (!targetDate) return;

  return new Promise((resolve, reject) => {
    const tx = db.transaction('shifts', 'readwrite');
    tx.objectStore('shifts').delete(targetDate);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Adds an employee to an existing shift.
 */
export async function addEmployee(
  shiftId: number,
  input: EmployeeInput
): Promise<ShiftEmployee> {
  const db = await openShiftDB();
  const shift = await getShiftById(shiftId);
  if (!shift) {
    throw new Error('シフト表が見つかりません');
  }

  const now = new Date().toISOString();
  const newEmpId = generateUniqueId();
  const nextDisplayOrder = shift.employees.length + 1;

  const newEmployee: ShiftEmployee = {
    id: newEmpId,
    shift_id: shiftId,
    display_order: nextDisplayOrder,
    employee_code: input.employee_code || null,
    employee_name: input.employee_name,
    nickname: input.nickname || null,
    remarks: input.remarks || null,
    planned_start_time: input.planned_start_time || null,
    actual_start_time: input.actual_start_time || null,
    planned_end_time: input.planned_end_time || null,
    break_time: input.break_time || null,
    locker_number: input.locker_number || null,
    signature: input.signature || null,
    created_at: now,
    updated_at: now,
  };

  shift.employees.push(newEmployee);
  shift.updated_at = now;

  return new Promise((resolve, reject) => {
    const tx = db.transaction('shifts', 'readwrite');
    tx.objectStore('shifts').put(shift);
    tx.oncomplete = () => {
      updateStaffCatalog([newEmployee]);
      resolve(newEmployee);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Updates an existing employee.
 */
export async function updateEmployee(
  employeeId: number,
  input: Partial<EmployeeInput>
): Promise<ShiftEmployee> {
  const db = await openShiftDB();
  const allShifts = await listAllShiftRecords();

  let targetShift: ShiftWithEmployees | null = null;
  let targetIndex = -1;

  for (const s of allShifts) {
    const idx = s.employees.findIndex((e) => e.id === employeeId);
    if (idx !== -1) {
      targetShift = s;
      targetIndex = idx;
      break;
    }
  }

  if (!targetShift || targetIndex === -1) {
    throw new Error('スタッフが見つかりません');
  }

  const existing = targetShift.employees[targetIndex];
  const now = new Date().toISOString();

  const updatedEmployee: ShiftEmployee = {
    ...existing,
    ...(input.employee_name !== undefined && { employee_name: input.employee_name }),
    ...(input.employee_code !== undefined && { employee_code: input.employee_code || null }),
    ...(input.nickname !== undefined && { nickname: input.nickname || null }),
    ...(input.remarks !== undefined && { remarks: input.remarks || null }),
    ...(input.planned_start_time !== undefined && {
      planned_start_time: input.planned_start_time || null,
    }),
    ...(input.actual_start_time !== undefined && {
      actual_start_time: input.actual_start_time || null,
    }),
    ...(input.planned_end_time !== undefined && {
      planned_end_time: input.planned_end_time || null,
    }),
    ...(input.break_time !== undefined && { break_time: input.break_time || null }),
    ...(input.locker_number !== undefined && {
      locker_number: input.locker_number || null,
    }),
    ...(input.signature !== undefined && { signature: input.signature || null }),
    updated_at: now,
  };

  targetShift.employees[targetIndex] = updatedEmployee;
  targetShift.updated_at = now;

  return new Promise((resolve, reject) => {
    const tx = db.transaction('shifts', 'readwrite');
    tx.objectStore('shifts').put(targetShift);
    tx.oncomplete = () => {
      updateStaffCatalog([updatedEmployee]);
      resolve(updatedEmployee);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Deletes an employee from a shift.
 */
export async function deleteEmployee(employeeId: number): Promise<void> {
  const db = await openShiftDB();
  const allShifts = await listAllShiftRecords();

  let targetShift: ShiftWithEmployees | null = null;

  for (const s of allShifts) {
    const exists = s.employees.some((e) => e.id === employeeId);
    if (exists) {
      targetShift = s;
      break;
    }
  }

  if (!targetShift) return;

  targetShift.employees = targetShift.employees
    .filter((e) => e.id !== employeeId)
    .map((e, idx) => ({ ...e, display_order: idx + 1 }));
  targetShift.updated_at = new Date().toISOString();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('shifts', 'readwrite');
    tx.objectStore('shifts').put(targetShift);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Reorders employees in a shift according to orderedIds.
 */
export async function reorderEmployees(
  shiftId: number,
  orderedIds: number[]
): Promise<void> {
  const db = await openShiftDB();
  const shift = await getShiftById(shiftId);
  if (!shift) throw new Error('シフト表が見つかりません');

  const empMap = new Map(shift.employees.map((e) => [e.id, e]));
  const reordered: ShiftEmployee[] = [];

  orderedIds.forEach((id, idx) => {
    const emp = empMap.get(id);
    if (emp) {
      reordered.push({ ...emp, display_order: idx + 1 });
      empMap.delete(id);
    }
  });

  // Append any leftovers
  empMap.forEach((emp) => {
    reordered.push({ ...emp, display_order: reordered.length + 1 });
  });

  shift.employees = reordered;
  shift.updated_at = new Date().toISOString();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('shifts', 'readwrite');
    tx.objectStore('shifts').put(shift);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Updates a shift's header snapshot.
 */
export async function updateShiftHeaderSnapshot(
  shiftId: number,
  header: HeaderSnapshot
): Promise<void> {
  const db = await openShiftDB();
  const shift = await getShiftById(shiftId);
  if (!shift) throw new Error('シフト表が見つかりません');

  shift.header_snapshot = header;
  shift.updated_at = new Date().toISOString();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('shifts', 'readwrite');
    tx.objectStore('shifts').put(shift);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Applies global company and design settings to an existing shift.
 */
export async function applyCurrentSettingsToShift(
  shiftId: number
): Promise<ShiftWithEmployees> {
  const db = await openShiftDB();
  const shift = await getShiftById(shiftId);
  if (!shift) throw new Error('シフト表が見つかりません');

  const company = await getCompanySettings();
  const design = await getDesignSettings();

  shift.header_snapshot = company;
  shift.design_snapshot = design;
  shift.updated_at = new Date().toISOString();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('shifts', 'readwrite');
    tx.objectStore('shifts').put(shift);
    tx.oncomplete = () => resolve(shift);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Lists all shift dates within range [startDate, endDate].
 */
export async function listShiftDatesInRange(
  startDate: string,
  endDate: string
): Promise<string[]> {
  const all = await listAllShiftRecords();
  return all
    .filter((s) => s.shift_date >= startDate && s.shift_date <= endDate)
    .map((s) => s.shift_date)
    .sort();
}

/**
 * Helper to fetch all ShiftWithEmployees records from IndexedDB.
 */
export async function listAllShiftRecords(): Promise<ShiftWithEmployees[]> {
  if (!getIndexedDB()) return [];
  try {
    const db = await openShiftDB();
    return new Promise((resolve) => {
      const tx = db.transaction('shifts', 'readonly');
      const req = tx.objectStore('shifts').getAll();
      req.onsuccess = () => {
        resolve((req.result as ShiftWithEmployees[]) || []);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Summarizes all shifts for history view.
 */
export async function listAllShifts(): Promise<
  Array<{
    id: number;
    shift_date: string;
    staff_count: number;
    nicknames: string[];
  }>
> {
  const all = await listAllShiftRecords();
  return all
    .map((s) => ({
      id: s.id,
      shift_date: s.shift_date,
      staff_count: s.employees.length,
      nicknames: s.employees
        .map((e) => e.nickname?.trim())
        .filter((n): n is string => Boolean(n && n.length > 0)),
    }))
    .sort((a, b) => b.shift_date.localeCompare(a.shift_date));
}

/**
 * Searches staff suggestions in real time based on query.
 */
export async function searchStaffSuggestions(query: string): Promise<StaffSuggestion[]> {
  if (!getIndexedDB()) return [];
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const map = new Map<string, StaffSuggestion>();

  try {
    const db = await openShiftDB();

    // Query staff_catalog
    const catalogReq = new Promise<StaffSuggestion[]>((resolve) => {
      const tx = db.transaction('staff_catalog', 'readonly');
      const req = tx.objectStore('staff_catalog').getAll();
      req.onsuccess = () => resolve((req.result as StaffSuggestion[]) || []);
      req.onerror = () => resolve([]);
    });

    const catalogItems = await catalogReq;
    for (const item of catalogItems) {
      if (
        item.employee_name.toLowerCase().includes(q) ||
        (item.nickname && item.nickname.toLowerCase().includes(q)) ||
        (item.employee_code && item.employee_code.toLowerCase().includes(q))
      ) {
        map.set(item.employee_name, item);
      }
    }

    // Also scan existing shifts in case catalog was cleared
    const shifts = await listAllShiftRecords();
    for (const s of shifts) {
      for (const e of s.employees) {
        if (
          e.employee_name.toLowerCase().includes(q) ||
          (e.nickname && e.nickname.toLowerCase().includes(q)) ||
          (e.employee_code && e.employee_code.toLowerCase().includes(q))
        ) {
          if (!map.has(e.employee_name)) {
            map.set(e.employee_name, {
              employee_name: e.employee_name,
              employee_code: e.employee_code,
              nickname: e.nickname,
              remarks: e.remarks,
              planned_start_time: e.planned_start_time,
              actual_start_time: e.actual_start_time,
              planned_end_time: e.planned_end_time,
              break_time: e.break_time,
              locker_number: e.locker_number,
            });
          }
        }
      }
    }
  } catch {
    // Return empty on error
  }

  return Array.from(map.values()).slice(0, 10);
}

/**
 * Exports complete database to JSON for backup.
 */
export async function exportFullBackupJSON(): Promise<string> {
  const shifts = await listAllShiftRecords();
  const company = await getCompanySettings();
  const design = await getDesignSettings();

  const backupData = {
    version: 1,
    exported_at: new Date().toISOString(),
    company_settings: company,
    design_settings: design,
    shifts,
  };

  return JSON.stringify(backupData, null, 2);
}

/**
 * Imports complete database from JSON backup.
 */
export async function importFullBackupJSON(jsonStr: string): Promise<void> {
  const data = JSON.parse(jsonStr);
  if (!data || !Array.isArray(data.shifts)) {
    throw new Error('無効なバックアップデータ形式です');
  }

  const db = await openShiftDB();

  // Save settings if present
  if (data.company_settings) {
    await updateCompanySettings(data.company_settings);
  }
  if (data.design_settings) {
    await updateDesignSettings(data.design_settings);
  }

  // Save shifts
  const tx = db.transaction(['shifts', 'staff_catalog'], 'readwrite');
  const shiftStore = tx.objectStore('shifts');
  const catalogStore = tx.objectStore('staff_catalog');

  for (const s of data.shifts) {
    if (s.shift_date) {
      shiftStore.put(s);
      if (Array.isArray(s.employees)) {
        for (const e of s.employees) {
          if (e.employee_name) {
            catalogStore.put({
              employee_name: e.employee_name,
              employee_code: e.employee_code || null,
              nickname: e.nickname || null,
              remarks: e.remarks || null,
              planned_start_time: e.planned_start_time || null,
              actual_start_time: e.actual_start_time || null,
              planned_end_time: e.planned_end_time || null,
              break_time: e.break_time || null,
              locker_number: e.locker_number || null,
            });
          }
        }
      }
    }
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
