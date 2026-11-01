import { ShiftWithEmployees } from '../types';
import { buildSheetModel } from '../sheet';
import { generateShiftExcelWorkbook } from './excel';

/**
 * Triggers a download of a Blob file in the browser.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates an Excel (.xlsx) workbook directly on the client side using ExcelJS
 * and triggers an immediate browser download.
 */
export async function exportShiftToExcel(shift: ShiftWithEmployees): Promise<void> {
  const model = buildSheetModel(shift, shift.header_snapshot, shift.design_snapshot);
  const workbook = await generateShiftExcelWorkbook(model);
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const filename = `${shift.shift_date}_勤務シフト表.xlsx`;
  triggerBlobDownload(blob, filename);
}

/**
 * Triggers client-side vector printing / PDF saving.
 * Saves the shift snapshot to local storage for instant print page access
 * and opens the dedicated A4 landscape print view with autoprint enabled.
 */
export function exportShiftToPdfOrPrint(
  shiftDate: string,
  shift?: ShiftWithEmployees | null
): void {
  if (typeof window === 'undefined') return;

  if (shift) {
    try {
      localStorage.setItem(`shift_snapshot_${shiftDate}`, JSON.stringify(shift));
    } catch {
      // Ignore storage quota errors
    }
  }

  // Open the dedicated A4 landscape vector print page in a new window/tab
  window.open(`/print/${shiftDate}?autoprint=1`, '_blank');
}
