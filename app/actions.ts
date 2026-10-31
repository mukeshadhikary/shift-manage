'use server';

import { revalidatePath } from 'next/cache';
import {
  createShift,
  getShiftByDate,
  getShiftById,
  copyPreviousShift,
  deleteShift,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  reorderEmployees,
  updateShiftHeaderSnapshot,
  updateCompanySettings,
  updateDesignSettings,
  restoreDefaultSettings,
  applyCurrentSettingsToShift,
  getCompanySettings,
  getDesignSettings,
  listShiftDatesInRange,
  listAllShifts,
  getPastStaffSuggestions,
  searchStaffSuggestions,
} from '@/lib/db/repository';
import { EmployeeInput } from '@/lib/db/schema';
import { HeaderSnapshot, DesignSnapshot } from '@/lib/types';
import { ja } from '@/lib/i18n/ja';

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Creates or updates a shift with all employees in one transaction.
 */
export async function saveShiftWizardAction(data: {
  shift_date: string;
  header_snapshot?: HeaderSnapshot;
  design_snapshot?: DesignSnapshot;
  employees: EmployeeInput[];
}): Promise<ActionResult> {
  try {
    const existing = getShiftByDate(data.shift_date);
    let shift;
    if (existing) {
      if (data.header_snapshot) {
        updateShiftHeaderSnapshot(existing.id, data.header_snapshot);
      }
      for (const emp of data.employees) {
        addEmployee(existing.id, emp);
      }
      shift = getShiftById(existing.id);
    } else {
      shift = createShift(data);
    }
    revalidatePath('/');
    revalidatePath(`/print/${data.shift_date}`);
    return { success: true, data: shift };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ja.toasts.saveFailed;
    return { success: false, error: message };
  }
}

/**
 * Copies closest earlier shift into targetDate.
 */
export async function copyPreviousShiftAction(targetDate: string): Promise<ActionResult> {
  try {
    const shift = copyPreviousShift(targetDate);
    revalidatePath('/');
    revalidatePath(`/print/${targetDate}`);
    return { success: true, data: shift };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ja.toasts.copyFailed;
    return { success: false, error: message };
  }
}

/**
 * Deletes a shift by date or id.
 */
export async function deleteShiftAction(shiftId: number, shiftDate?: string): Promise<ActionResult> {
  try {
    deleteShift(shiftId);
    revalidatePath('/');
    if (shiftDate) {
      revalidatePath(`/print/${shiftDate}`);
    }
    return { success: true, data: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ja.toasts.deleteFailed;
    return { success: false, error: message };
  }
}

/**
 * Adds an employee to an existing shift.
 */
export async function addEmployeeAction(shiftId: number, employee: EmployeeInput): Promise<ActionResult> {
  try {
    const created = addEmployee(shiftId, employee);
    revalidatePath('/');
    return { success: true, data: created };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ja.toasts.saveFailed;
    return { success: false, error: message };
  }
}

/**
 * Updates an employee on an existing shift.
 */
export async function updateEmployeeAction(
  employeeId: number,
  employee: Partial<EmployeeInput>
): Promise<ActionResult> {
  try {
    const updated = updateEmployee(employeeId, employee);
    revalidatePath('/');
    return { success: true, data: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ja.toasts.saveFailed;
    return { success: false, error: message };
  }
}

/**
 * Deletes an employee from a shift.
 */
export async function deleteEmployeeAction(employeeId: number): Promise<ActionResult> {
  try {
    deleteEmployee(employeeId);
    revalidatePath('/');
    return { success: true, data: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ja.toasts.deleteFailed;
    return { success: false, error: message };
  }
}

/**
 * Reorders employees in a shift.
 */
export async function reorderEmployeesAction(
  shiftId: number,
  employeeIdsInOrder: number[]
): Promise<ActionResult> {
  try {
    reorderEmployees(shiftId, employeeIdsInOrder);
    revalidatePath('/');
    return { success: true, data: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ja.toasts.saveFailed;
    return { success: false, error: message };
  }
}

/**
 * Updates this shift's header snapshot only.
 */
export async function updateShiftHeaderAction(
  shiftId: number,
  headerSnapshot: HeaderSnapshot
): Promise<ActionResult> {
  try {
    updateShiftHeaderSnapshot(shiftId, headerSnapshot);
    revalidatePath('/');
    return { success: true, data: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ja.toasts.saveFailed;
    return { success: false, error: message };
  }
}

/**
 * Saves global company and design settings, and optionally applies to the currently viewed shift.
 */
export async function saveGlobalSettingsAction(data: {
  companySettings: HeaderSnapshot;
  designSettings: DesignSnapshot;
  applyToShiftId?: number | null;
}): Promise<ActionResult> {
  try {
    updateCompanySettings(data.companySettings);
    updateDesignSettings(data.designSettings);

    if (data.applyToShiftId) {
      applyCurrentSettingsToShift(data.applyToShiftId);
    }

    revalidatePath('/');
    return { success: true, data: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ja.toasts.saveFailed;
    return { success: false, error: message };
  }
}

/**
 * Restores global settings to default.
 */
export async function restoreDefaultSettingsAction(): Promise<ActionResult> {
  try {
    restoreDefaultSettings();
    revalidatePath('/');
    return { success: true, data: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ja.toasts.saveFailed;
    return { success: false, error: message };
  }
}

/**
 * Client query helper: get shift for date.
 */
export async function fetchShiftDataAction(date: string) {
  const shift = getShiftByDate(date);
  const companySettings = getCompanySettings();
  const designSettings = getDesignSettings();
  return { shift, companySettings, designSettings };
}

/**
 * Client query helper: check dates in range for calendar dots.
 */
export async function fetchShiftDatesInRangeAction(startDate: string, endDate: string) {
  return listShiftDatesInRange(startDate, endDate);
}

/**
 * Client query helper: list all shifts for history.
 */
export async function fetchAllShiftsHistoryAction() {
  return listAllShifts();
}

/**
 * Client query helper: get past staff suggestions for autocomplete.
 */
export async function fetchStaffSuggestionsAction() {
  return getPastStaffSuggestions();
}

/**
 * Client query helper: real-time staff search across database.
 */
export async function searchStaffSuggestionsAction(query: string) {
  return searchStaffSuggestions(query);
}
